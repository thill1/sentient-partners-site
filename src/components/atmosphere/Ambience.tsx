import { useEffect, useRef } from "react";
import {
  activeScene,
  easeLighting,
  sceneLighting,
  type Scene,
} from "./sceneTime";

/**
 * Where the light comes from in each scene. `x` is a share of the visible
 * frame's width, so a phone's narrow crop still sees the sun; `y` is in
 * artwork coordinates (1536 x 1024), tied to the horizon.
 */
const sources: Record<
  Scene,
  {
    x: number;
    y: number;
    radius: number;
    strength: number;
    rgb: [number, number, number];
    glints: number;
    glintRgb: [number, number, number];
    /** How much wider than the light itself the shimmer on the water spreads. */
    scatter: number;
  }
> = {
  sunrise: {
    x: 0.3,
    y: 236,
    radius: 560,
    strength: 0.8,
    rgb: [255, 186, 140],
    glints: 0.85,
    glintRgb: [255, 206, 170],
    scatter: 0.18,
  },
  day: {
    x: 0.82,
    y: -140,
    radius: 980,
    strength: 0.5,
    rgb: [255, 249, 232],
    glints: 1,
    glintRgb: [255, 255, 246],
    scatter: 0.6,
  },
  sunset: {
    x: 1,
    y: 214,
    radius: 640,
    strength: 1,
    rgb: [255, 150, 74],
    glints: 0.95,
    glintRgb: [255, 186, 112],
    scatter: 0.12,
  },
  night: {
    x: 0.3,
    y: 205,
    radius: 300,
    strength: 0.3,
    rgb: [190, 208, 255],
    glints: 0.7,
    glintRgb: [214, 224, 246],
    scatter: 0.05,
  },
};

const SUTRO: [number, number] = [1433, 207];

/** Deterministic, so the sky is the same on every visit. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function buildSky() {
  const random = seeded(20260609);
  const stars = Array.from({ length: 420 }, () => ({
    x: random() * 1536,
    y: 225 * random() ** 1.2,
    size: 0.7 + random() ** 3 * 1.4,
    phase: random() * Math.PI * 2,
    speed: 0.6 + random() * 1.8,
  }));
  // City lights: a dense band along the waterfront, stacks up the downtown towers.
  const city: { x: number; y: number; warm: boolean; phase: number }[] = [];
  for (let i = 0; i < 420; i++) {
    const x = 610 + random() * 910;
    const y = 262 + random() ** 0.8 * 52;
    city.push({ x, y, warm: random() < 0.75, phase: random() * 9 });
  }
  const towers: [number, number, number][] = [
    [782, 206, 262],
    [880, 222, 266],
    [953, 238, 282],
    [828, 236, 270],
    [742, 246, 274],
    [905, 240, 276],
    [1095, 256, 286],
  ];
  for (const [x, top, bottom] of towers)
    for (let y = top + 4; y < bottom; y += 3 + random() * 3)
      if (random() < 0.7)
        city.push({
          x: x + (random() - 0.5) * 9,
          y,
          warm: random() < 0.5,
          phase: random() * 9,
        });
  // Rows of ripple across the water, packed tighter toward the horizon. Each
  // carries a few broken highlights: [offset, length] in widths of the path.
  const ripples: { y: number; phase: number; segments: number[][] }[] = [];
  for (let y = 336; y < 1024; y += 1.6 + (y - 336) / 70)
    ripples.push({
      y,
      phase: random() * Math.PI * 2,
      segments: Array.from({ length: 4 }, () => [
        (random() - 0.5) * 2.4,
        0.25 + random() * 0.6,
      ]),
    });
  const reflections = Array.from({ length: 70 }, () => ({
    x: 640 + random() * 860,
    y: 322 + random() * 60,
    phase: random() * Math.PI * 2,
  }));
  return { stars, city, ripples, reflections };
}

/** A soft round highlight in one colour; stretched, it becomes a ripple or a streak. */
const sprites = new Map<string, HTMLCanvasElement>();
function highlight([r, g, b]: number[]) {
  const key = [r, g, b].map((c) => Math.round(c / 6)).join();
  let sprite = sprites.get(key);
  if (!sprite) {
    sprite = document.createElement("canvas");
    sprite.width = sprite.height = 32;
    const c = sprite.getContext("2d");
    if (c) {
      const glow = c.createRadialGradient(16, 16, 0, 16, 16, 16);
      glow.addColorStop(0, `rgba(${r | 0}, ${g | 0}, ${b | 0}, 1)`);
      glow.addColorStop(0.35, `rgba(${r | 0}, ${g | 0}, ${b | 0}, 0.55)`);
      glow.addColorStop(1, `rgba(${r | 0}, ${g | 0}, ${b | 0}, 0)`);
      c.fillStyle = glow;
      c.fillRect(0, 0, 32, 32);
    }
    if (sprites.size > 40) sprites.clear();
    sprites.set(key, sprite);
  }
  return sprite;
}

/**
 * A full moon as seen from California: limb darkening, the major maria in
 * their real places, and Tycho's bright crater near the southern edge.
 */
function paintMoon(size: number) {
  const moon = document.createElement("canvas");
  moon.width = moon.height = size;
  const c = moon.getContext("2d");
  if (!c) return moon;
  const R = size / 2;
  c.translate(R, R);
  c.beginPath();
  c.arc(0, 0, R, 0, Math.PI * 2);
  c.clip();
  const body = c.createRadialGradient(-R * 0.18, -R * 0.2, 0, 0, 0, R);
  body.addColorStop(0, "#fbf9f1");
  body.addColorStop(0.7, "#ebe6d8");
  body.addColorStop(1, "#c9c2b0");
  c.fillStyle = body;
  c.fillRect(-R, -R, size, size);
  // Mare positions and radii as fractions of the radius (x east, y south).
  const maria: number[][] = [
    [-0.5, 0.02, 0.3, 0.5, 0.3], // Oceanus Procellarum
    [-0.25, -0.36, 0.3, 0.22, 0.42], // Imbrium
    [0.17, -0.38, 0.17, 0.16, 0.45], // Serenitatis
    [0.33, -0.08, 0.21, 0.18, 0.45], // Tranquillitatis
    [0.7, -0.3, 0.1, 0.12, 0.5], // Crisium
    [0.55, 0.16, 0.12, 0.17, 0.36], // Fecunditatis
    [-0.12, 0.36, 0.18, 0.13, 0.32], // Nubium
    [-0.43, 0.4, 0.1, 0.1, 0.36], // Humorum
    [-0.05, -0.68, 0.42, 0.07, 0.3], // Frigoris
    [0.28, 0.42, 0.12, 0.1, 0.28], // Nectaris
  ];
  c.filter = `blur(${Math.max(1, size / 60)}px)`;
  for (const [x, y, rx, ry, a] of maria) {
    c.fillStyle = `rgba(118, 116, 110, ${a})`;
    c.beginPath();
    c.ellipse(x * R, y * R, rx * R, ry * R, 0.3, 0, Math.PI * 2);
    c.fill();
  }
  c.filter = "none";
  // Tycho and its rays, Copernicus and Kepler as small bright craters.
  c.strokeStyle = "rgba(255, 255, 250, 0.12)";
  c.lineWidth = Math.max(0.5, R / 50);
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2 + 0.3;
    c.beginPath();
    c.moveTo(-0.1 * R, 0.7 * R);
    c.lineTo(
      -0.1 * R + Math.cos(angle) * R * 0.75,
      0.7 * R + Math.sin(angle) * R * 0.75,
    );
    c.stroke();
  }
  for (const [x, y, r] of [
    [-0.1, 0.7, 0.045],
    [-0.3, -0.06, 0.03],
    [-0.6, -0.04, 0.022],
  ]) {
    c.fillStyle = "rgba(255, 255, 252, 0.9)";
    c.beginPath();
    c.arc(x * R, y * R, r * R, 0, Math.PI * 2);
    c.fill();
  }
  return moon;
}

/**
 * The Marin headland the bridge lands on (artwork coordinates). At night the
 * photograph's own hillside sinks into the dark, so it is drawn back in as a
 * silhouette with a moonlit ridge.
 */
const HEADLAND = [
  [0, 318],
  [60, 311],
  [140, 305],
  [220, 300],
  [300, 302],
  [380, 306],
  [440, 312],
  [500, 322],
  [560, 334],
  [620, 350],
  [700, 362],
  [780, 368],
  [860, 372],
  [930, 377],
  [900, 386],
  [800, 395],
  [700, 410],
  [640, 428],
  [560, 436],
  [450, 434],
  [360, 430],
  [300, 432],
  [200, 440],
  [100, 445],
  [0, 450],
];
function paintLand(canvas: HTMLCanvasElement, ratio: number, focus: number[]) {
  const width = canvas.clientWidth,
    height = canvas.clientHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const c = canvas.getContext("2d");
  if (!c) return;
  const scale = Math.max(width / 1536, height / 1024);
  c.setTransform(ratio, 0, 0, ratio, 0, 0);
  c.translate(
    (width - 1536 * scale) * focus[0],
    (height - 1024 * scale) * focus[1],
  );
  c.scale(scale, scale);
  // A tree line along the ridge: small deterministic bumps.
  const random = seeded(4127);
  const ridge: number[][] = [];
  for (let i = 0; i < 13; i++) {
    const [x0, y0] = HEADLAND[i],
      [x1, y1] = HEADLAND[i + 1];
    for (let k = 0; k < 8; k++) {
      const f = k / 8;
      ridge.push([x0 + (x1 - x0) * f, y0 + (y1 - y0) * f - random() * 4]);
    }
  }
  ridge.push(HEADLAND[13]);
  // A faint glow along the horizon behind the hill, so its outline reads.
  c.save();
  c.translate(470, 318);
  c.scale(1, 0.14);
  const sky = c.createRadialGradient(0, 0, 0, 0, 0, 620);
  sky.addColorStop(0, "rgba(78, 100, 140, 0.5)");
  sky.addColorStop(0.5, "rgba(78, 100, 140, 0.2)");
  sky.addColorStop(1, "rgba(72, 94, 132, 0)");
  c.fillStyle = sky;
  c.fillRect(-620, -620, 1240, 1240);
  c.restore();
  c.beginPath();
  ridge.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  HEADLAND.slice(14).forEach(([x, y]) => c.lineTo(x, y));
  c.closePath();
  const ground = c.createLinearGradient(0, 300, 0, 450);
  ground.addColorStop(0, "#0d1824");
  ground.addColorStop(1, "#08111a");
  c.fillStyle = ground;
  c.shadowColor = "#08111a";
  c.shadowBlur = 6;
  c.fill();
  c.shadowBlur = 0;
  // Moonlight catching the ridge.
  c.beginPath();
  ridge.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = "rgba(170, 188, 220, 0.14)";
  c.lineWidth = 1;
  c.shadowColor = "rgba(170, 188, 220, 0.35)";
  c.shadowBlur = 4;
  c.stroke();
  c.shadowBlur = 0;
  // The approach road: the deck's line carried on from its far end (where
  // the traffic model's road begins) up onto the headland, lamps fading
  // into the hill.
  const [ex, ey] = [490, 325],
    [dx, dy] = [245, 64];
  c.strokeStyle = "rgba(40, 30, 28, 0.9)";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(ex, ey);
  c.lineTo(ex - dx * 0.38, ey - dy * 0.38);
  c.stroke();
  c.globalCompositeOperation = "lighter";
  for (let t = 0.03; t < 0.38; t += 0.035) {
    const fade = 1 - t / 0.38;
    for (const side of [-1.6, 1.6]) {
      const x = ex - dx * t,
        y = ey - dy * t + side - 1.5;
      const glow = c.createRadialGradient(x, y, 0, x, y, 2.4);
      glow.addColorStop(0, `rgba(255, 210, 150, ${0.75 * fade})`);
      glow.addColorStop(1, "rgba(255, 170, 90, 0)");
      c.fillStyle = glow;
      c.fillRect(x - 2.4, y - 2.4, 4.8, 4.8);
    }
  }
  c.globalCompositeOperation = "source-over";
}

/** Light that belongs to the hour: stars, the moon, the city, the sun's glow and glints on the water. */
export default function Ambience() {
  const ref = useRef<HTMLCanvasElement>(null);
  const moonRef = useRef<HTMLCanvasElement>(null);
  const landRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const moon = moonRef.current;
    if (!moon) return;
    const paint = () => {
      const size = Math.ceil(moon.clientWidth * Math.min(devicePixelRatio, 2));
      if (!size || moon.width === size) return;
      const art = paintMoon(size);
      moon.width = moon.height = size;
      moon.getContext("2d")?.drawImage(art, 0, 0);
    };
    const observer = new ResizeObserver(paint);
    observer.observe(moon);
    paint();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const sky = buildSky();
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lighting = { ...sceneLighting[activeScene()] };
    let source = { ...sources[activeScene()] };
    let width = 0,
      height = 0,
      ratio = 1,
      frame = 0,
      previous = 0,
      visible = true,
      focus = [0.64, 0.48],
      // The part of this oversized canvas the visitor actually sees (CSS px):
      // left, width, top, height.
      view = [0, 1, 0, 1],
      // The moon's place in the visible sky (artwork coordinates), matching
      // the .scene-moon element: 30% across, 19% down the frame.
      moonAt = [400, 200];
    // Sparkles: brief star-shaped flashes in the path of the light.
    let sparkles: {
      x: number;
      y: number;
      born: number;
      life: number;
      size: number;
    }[] = [];
    let lastSpawn = 0;
    const readFocus = () => {
      const image = canvas.parentElement?.querySelector<HTMLImageElement>(
        ".scene-bay, .scene-poster",
      );
      if (!image) return;
      const [x = "64%", y = "48%"] =
        getComputedStyle(image).objectPosition.split(" ");
      const value = (part: string, fallback: number) =>
        part.endsWith("%") ? parseFloat(part) / 100 : fallback;
      focus = [value(x, 0.64), value(y, 0.48)];
    };
    const blend = (seconds: number) => {
      lighting = easeLighting(lighting, seconds);
      const scene = activeScene();
      // At night the light comes from wherever the moon sits in this frame.
      const target =
        scene === "night" ? { ...sources.night, y: moonAt[1] } : sources[scene];
      const k = Math.min(1, seconds * 1.6);
      const mix = (a: number, b: number) => a + (b - a) * k;
      source = {
        ...target,
        x: mix(source.x, target.x),
        y: mix(source.y, target.y),
        radius: mix(source.radius, target.radius),
        strength: mix(source.strength, target.strength),
        glints: mix(source.glints, target.glints),
        scatter: mix(source.scatter, target.scatter),
        rgb: source.rgb.map((c, i) => mix(c, target.rgb[i])) as [
          number,
          number,
          number,
        ],
        glintRgb: source.glintRgb.map((c, i) => mix(c, target.glintRgb[i])) as [
          number,
          number,
          number,
        ],
      };
    };
    const rgba = ([r, g, b]: number[], a: number) =>
      `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${Math.max(0, Math.min(1, a))})`;

    const render = (t: number) => {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const scale = Math.max(width / 1536, height / 1024);
      ctx.translate(
        (width - 1536 * scale) * focus[0],
        (height - 1024 * scale) * focus[1],
      );
      ctx.scale(scale, scale);
      ctx.globalCompositeOperation = "lighter";
      // The artwork's visible span, so light sources sit inside the frame.
      const left = (view[0] - (width - 1536 * scale) * focus[0]) / scale;
      const span = view[1] / scale;
      const sourceX = left + span * source.x;

      // The sun (or the moon's wash) behind everything else.
      if (source.strength > 0.01) {
        const glow = ctx.createRadialGradient(
          sourceX,
          source.y,
          0,
          sourceX,
          source.y,
          source.radius,
        );
        glow.addColorStop(0, rgba(source.rgb, 0.55 * source.strength));
        glow.addColorStop(0.18, rgba(source.rgb, 0.28 * source.strength));
        glow.addColorStop(0.55, rgba(source.rgb, 0.07 * source.strength));
        glow.addColorStop(1, rgba(source.rgb, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(
          sourceX - source.radius,
          source.y - source.radius,
          source.radius * 2,
          source.radius * 2,
        );
      }

      if (lighting.stars > 0.01) {
        for (const s of sky.stars) {
          const twinkle = 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
          const fade = 1 - (s.y / 230) ** 3;
          ctx.fillStyle = `rgba(236, 241, 255, ${Math.min(1, 1.2 * lighting.stars * twinkle * fade)})`;
          ctx.fillRect(s.x, s.y, s.size, s.size);
        }
      }

      if (lighting.city > 0.01) {
        for (const c of sky.city) {
          const flicker = 0.75 + 0.25 * Math.sin(t * 0.7 + c.phase * 3);
          ctx.fillStyle = c.warm
            ? `rgba(255, 210, 150, ${0.85 * lighting.city * flicker})`
            : `rgba(226, 234, 255, ${0.7 * lighting.city * flicker})`;
          ctx.fillRect(c.x, c.y, 1.7, 1.7);
        }
        // Wavering reflections of the waterfront.
        const warm = highlight([255, 200, 140]);
        for (const r of sky.reflections) {
          ctx.globalAlpha =
            0.45 * lighting.city * (0.5 + 0.5 * Math.sin(t * 2.2 + r.phase));
          const length = 6 + (r.y - 322) / 6;
          ctx.drawImage(
            warm,
            r.x + Math.sin(t + r.phase) * 1.5 - 1,
            r.y,
            2.2,
            length,
          );
        }
        ctx.globalAlpha = 1;
        // Sutro Tower's red beacons.
        const blink = 0.5 + 0.5 * Math.sin(t * 2.4);
        ctx.fillStyle = `rgba(255, 60, 40, ${lighting.city * blink})`;
        ctx.fillRect(SUTRO[0] - 1, SUTRO[1] - 1, 2.2, 2.2);
        ctx.fillRect(SUTRO[0] - 1, SUTRO[1] + 22, 2, 2);
      }

      // The path of light on the water: broken, horizontally stretched
      // highlights under the sun or moon, brightening in swells that roll
      // toward the viewer, widening with distance from the horizon.
      if (source.glints > 0.01) {
        const pathX = sourceX;
        const sprite = highlight(source.glintRgb);
        const breadth = 1 + source.scatter * 1.6;
        for (const row of sky.ripples) {
          const depth = (row.y - 336) / 688;
          const spread = (46 + depth * 520) * breadth;
          const swell =
            0.3 +
            0.7 *
              Math.max(0, Math.sin(row.y * 0.11 - t * 1.6 + row.phase * 0.4)) **
                2;
          const thickness = 0.7 + depth * 3;
          for (const [offset, length] of row.segments) {
            const drift = Math.sin(t * 0.7 + row.phase + offset * 3) * 0.12;
            const cx = pathX + (offset + drift) * spread * 0.5;
            const fall = Math.exp(-(((cx - pathX) / spread) ** 2) * 1.8);
            const a = source.glints * swell * fall * (0.28 - 0.12 * depth);
            if (a < 0.015) continue;
            const w = length * spread * 0.15;
            ctx.globalAlpha = Math.min(1, a);
            ctx.drawImage(
              sprite,
              cx - w / 2,
              row.y + Math.sin(t * 0.55 + row.phase) * (0.4 + depth * 1.5) - thickness / 2,
              w,
              thickness,
            );
          }
        }
        // Small, low glints where wave crests catch the light.
        if (!still) {
          const rate = 9 * source.glints;
          if (t - lastSpawn > 1 / Math.max(0.1, rate) && sparkles.length < 18) {
            lastSpawn = t;
            const row =
              sky.ripples[
                Math.floor(Math.random() ** 1.4 * sky.ripples.length)
              ];
            const depth = (row.y - 336) / 688;
            const spread = (46 + depth * 520) * breadth;
            const gauss =
              (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
            sparkles.push({
              x: pathX + gauss * spread * 0.6,
              y: row.y,
              born: t,
              life: 0.35 + Math.random() * 0.6,
              size: 0.8 + depth * 2.6,
            });
          }
          sparkles = sparkles.filter((p) => t - p.born < p.life);
          const white = highlight([255, 255, 250]);
          for (const p of sparkles) {
            const age = (t - p.born) / p.life;
            const a = source.glints * Math.sin(Math.PI * age) ** 2;
            ctx.globalAlpha = Math.min(1, a);
            const h = 4 * p.size;
            ctx.drawImage(
              sprite,
              p.x - h / 2,
              p.y - p.size * 0.4,
              h,
              p.size * 0.8,
            );
            ctx.drawImage(
              white,
              p.x - p.size * 0.5,
              p.y - p.size * 0.25,
              p.size,
              p.size * 0.5,
            );
          }
        }
        ctx.globalAlpha = 1;
      }
      canvas.dataset.scene = activeScene();
    };

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (now - previous < 40) return;
      const dt = Math.min(0.2, (now - previous) / 1000);
      previous = now;
      blend(dt);
      render(now / 1000);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      if (still) return;
      if (visible && !document.hidden && width > 0) {
        previous = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };
    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      ratio = Math.min(devicePixelRatio, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      readFocus();
      if (landRef.current) paintLand(landRef.current, ratio, focus);
      const box = canvas.getBoundingClientRect(),
        frameBox = canvas.parentElement?.getBoundingClientRect() ?? box;
      view = [
        Math.max(0, frameBox.left - box.left),
        Math.min(width, frameBox.width),
        Math.max(0, frameBox.top - box.top),
        Math.min(height, frameBox.height),
      ];
      const scale = Math.max(width / 1536, height / 1024);
      moonAt = [
        0,
        (view[2] + view[3] * 0.19 - (height - 1024 * scale) * focus[1]) / scale,
      ];
      render(performance.now() / 1000);
      schedule();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    // Without motion, repaint a still frame whenever the scene changes.
    const stillTimer = still
      ? window.setInterval(() => {
          blend(10);
          render(0);
        }, 1000)
      : 0;
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    });
    intersection.observe(canvas);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(stillTimer);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", schedule);
    };
  }, []);
  return (
    <>
      <canvas ref={landRef} className="scene-land" aria-hidden="true" />
      <canvas ref={ref} className="scene-ambience" aria-hidden="true" />
      <canvas ref={moonRef} className="scene-moon" aria-hidden="true" />
    </>
  );
}
