/**
 * City scene, a live, long-exposure layer over a still photograph.
 *
 * Two canvases sit on the photo:
 *  - trails:  never fully cleared; fades a little each frame, so moving lights
 *             leave exposure streaks (traffic, people, planes, demand).
 *  - overlay: cleared every frame; crisp elements (the network, inquiry pulses,
 *             aircraft beacons).
 *
 * One number drives the story: `order`, 0 → 1. At 0 demand is chaotic ,
 * traffic surges and brakes, inquiries go unanswered, lights wander. At 1 a
 * suspension-cable network from a hub holds everything: traffic evens out,
 * wandering lights ride the cables, and every inquiry is connected.
 */

export interface PathPoint {
  u: number;
  v: number;
  /** Perspective size at this point (1 = nearest). */
  s: number;
}

export interface LaneDef {
  path: PathPoint[];
  /** Lateral offset from the path, in image widths at size 1. Positive = right of travel from path start. */
  offset: number;
  /** 1 travels path start → end, -1 end → start. */
  dir: 1 | -1;
  kind: 'head' | 'tail';
  count: number;
  /** Speed in image widths per second at size 1. */
  speed: number;
}

export interface WalkDef {
  path: PathPoint[];
  offset: number;
  count: number;
}

export interface SceneDef {
  imageAspect: number;
  lanes: LaneDef[];
  walks: WalkDef[];
  /** Network hub. Omit for an ambient scene (traffic, people, aircraft only). */
  hub?: { u: number; v: number };
  towers?: { u: number; v: number }[];
  grounds?: { u: number; v: number; tower: number }[];
  chaosBounds?: [number, number, number, number];
  signalZones?: [number, number, number, number][];
  flights?: { from: [number, number]; to: [number, number] }[];
}

export interface CityScene {
  /** Move toward chaos (0) or order (1). */
  setTarget(order: 0 | 1, immediate?: boolean): void;
  setPaused(paused: boolean): void;
  /** Area (host-relative CSS px) where text sits; the scene softens there. */
  setQuietZone(zone: { x: number; y: number; w: number; h: number } | null): void;
  destroy(): void;
}

interface Options {
  host: HTMLElement;
  img: HTMLImageElement;
  trails: HTMLCanvasElement;
  overlay: HTMLCanvasElement;
  scene: SceneDef;
  reducedMotion: boolean;
  /** Called after each frame with the eased order value (0 to 1) and scene time in seconds. */
  onFrame?: (order: number, time: number) => void;
}

// ---------------------------------------------------------------- helpers

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};

/** Deterministic pseudo-random so every visit composes the same way. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type RGB = [number, number, number];
const WARM_WHITE: RGB = [255, 236, 206];
const TAIL_RED: RGB = [255, 46, 34];
const AMBER: RGB = [255, 176, 92];
const IVORY: RGB = [247, 240, 226];
const MISSED: RGB = [150, 156, 170];
const ORANGE: RGB = [214, 78, 48];

const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

function makeGlow(c: RGB) {
  const size = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, rgba(c, 1));
  grad.addColorStop(0.18, rgba(c, 0.55));
  grad.addColorStop(0.5, rgba(c, 0.12));
  grad.addColorStop(1, rgba(c, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return cv;
}

// Polyline in screen space with cumulative length, for sampling by distance.
interface Poly {
  x: number[];
  y: number[];
  s: number[];
  cum: number[];
  len: number;
}

function buildPoly(pts: { x: number; y: number; s: number }[]): Poly {
  const x = pts.map((p) => p.x);
  const y = pts.map((p) => p.y);
  const s = pts.map((p) => p.s);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(x[i] - x[i - 1], y[i] - y[i - 1]));
  return { x, y, s, cum, len: cum[cum.length - 1] };
}

interface Sample {
  x: number;
  y: number;
  s: number;
  nx: number;
  ny: number;
}

function sample(p: Poly, d: number, out: Sample) {
  const dd = clamp(d, 0, p.len);
  let i = 1;
  while (i < p.cum.length - 1 && p.cum[i] < dd) i++;
  const seg = p.cum[i] - p.cum[i - 1] || 1;
  const t = (dd - p.cum[i - 1]) / seg;
  const dx = p.x[i] - p.x[i - 1];
  const dy = p.y[i] - p.y[i - 1];
  const l = Math.hypot(dx, dy) || 1;
  out.x = lerp(p.x[i - 1], p.x[i], t);
  out.y = lerp(p.y[i - 1], p.y[i], t);
  out.s = lerp(p.s[i - 1], p.s[i], t);
  // Right-hand normal of travel from the path start.
  out.nx = -dy / l;
  out.ny = dx / l;
  return out;
}

// ---------------------------------------------------------------- entities

interface Vehicle {
  lane: number;
  d: number;
  seed: number;
  brake: number;
  px: number;
  py: number;
  live: boolean;
}

interface Walker {
  walk: number;
  d: number;
  dir: number;
  seed: number;
  pause: number;
  px: number;
  py: number;
  live: boolean;
}

interface Mote {
  cx: number;
  cy: number;
  route: number;
  t: number;
  speed: number;
  delay: number;
  seed: number;
  px: number;
  py: number;
  live: boolean;
}

interface Signal {
  x: number;
  y: number;
  age: number;
  life: number;
  answered: boolean;
  ground: number;
}

interface Plane {
  flight: number;
  t: number;
  dur: number;
  px: number;
  py: number;
  live: boolean;
}

// ---------------------------------------------------------------- engine

export function createCityScene(opts: Options): CityScene {
  const { host, img, trails, overlay, scene, reducedMotion, onFrame } = opts;
  const tctx = trails.getContext('2d')!;
  const octx = overlay.getContext('2d')!;
  const rand = rng(20260927);

  const glow = {
    warm: makeGlow(WARM_WHITE),
    red: makeGlow(TAIL_RED),
    amber: makeGlow(AMBER),
    ivory: makeGlow(IVORY),
    orange: makeGlow(ORANGE),
  };

  let cw = 0;
  let ch = 0;
  let dpr = 1;
  let dw = 0; // drawn image width (cover)
  let dh = 0;
  let ox = 0;
  let oy = 0;

  let lanePolys: Poly[] = [];
  let walkPolys: Poly[] = [];
  let routes: Poly[] = []; // ground → tower → hub, per ground node
  let cables: Poly[] = []; // hub → tower
  let suspenders: Poly[] = []; // tower → ground
  let hubX = 0;
  let hubY = 0;
  let towerXY: [number, number][] = [];
  let groundXY: [number, number][] = [];

  let order = 0;
  let target: 0 | 1 = 0;
  /** Seconds since the network came online; -1 when idle. */
  let ignite = -1;
  let hubFlash = 0;
  let time = 0;
  let signalClock = 0;
  let planeClock = 2.5;
  let nextFlight = 0;
  let paused = false;
  let visible = true;
  let raf = 0;
  let last = 0;
  let quiet: { x: number; y: number; w: number; h: number } | null = null;

  function inQuiet(x: number, y: number) {
    if (!quiet) return false;
    const cx = quiet.x + quiet.w * 0.45;
    const cy = quiet.y + quiet.h * 0.5;
    const dx = (x - cx) / (quiet.w * 0.7);
    const dy = (y - cy) / (quiet.h * 0.72);
    return dx * dx + dy * dy < 1;
  }

  /** Soft elliptical erase over the text block so type stays legible. */
  function soften(ctx: CanvasRenderingContext2D, strength: number) {
    if (!quiet) return;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.translate(quiet.x + quiet.w * 0.45, quiet.y + quiet.h * 0.5);
    ctx.scale(quiet.w * 0.78, quiet.h * 0.82);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(0,0,0,${strength})`);
    g.addColorStop(0.62, `rgba(0,0,0,${(strength * 0.8).toFixed(3)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }

  const vehicles: Vehicle[] = [];
  const walkers: Walker[] = [];
  const motes: Mote[] = [];
  const signals: Signal[] = [];
  const planes: Plane[] = [];
  const tmp: Sample = { x: 0, y: 0, s: 0, nx: 0, ny: 0 };
  // Chaos wiring: short-lived links between random points that never hold.
  const tangles: { a: number; b: number; c: number; d: number; age: number; life: number }[] = [];
  let tangleClock = 0;

  const map = (u: number, v: number): [number, number] => [ox + u * dw, oy + v * dh];
  const towers = scene.towers ?? [];
  const grounds = scene.hub ? scene.grounds ?? [] : [];
  const flights = scene.flights ?? [];
  const zones = scene.signalZones ?? [];
  const bounds = scene.chaosBounds ?? [0, 0, 1, 1];

  function objectPosition(): [number, number] {
    const parts = getComputedStyle(img).objectPosition.split(' ');
    const pct = (s: string | undefined) => (s && s.endsWith('%') ? parseFloat(s) / 100 : 0.5);
    return [pct(parts[0]), pct(parts[1])];
  }

  function layout() {
    cw = Math.max(1, host.clientWidth);
    ch = Math.max(1, host.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, cw < 700 ? 1.5 : 1.75, Math.sqrt(5.5e6 / (cw * ch)));
    for (const cv of [trails, overlay]) {
      cv.width = Math.round(cw * dpr);
      cv.height = Math.round(ch * dpr);
    }
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const aspect = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : scene.imageAspect;
    const scale = Math.max(cw / aspect, ch);
    dw = aspect * scale;
    dh = scale;
    const [px, py] = objectPosition();
    ox = (cw - dw) * px;
    oy = (ch - dh) * py;

    const toScreen = (pts: PathPoint[]) => pts.map((p) => ({ x: ox + p.u * dw, y: oy + p.v * dh, s: p.s }));
    lanePolys = scene.lanes.map((l) => buildPoly(toScreen(l.path)));
    walkPolys = scene.walks.map((w) => buildPoly(toScreen(w.path)));

    const hub = scene.hub ?? { u: 0.5, v: 0.5 };
    [hubX, hubY] = map(hub.u, hub.v);
    towerXY = towers.map((t) => map(t.u, t.v));
    groundXY = grounds.map((g) => map(g.u, g.v));

    // Cables sag like suspension cables between the hub and each tower.
    cables = towerXY.map(([tx, ty]) => {
      const pts: { x: number; y: number; s: number }[] = [];
      const dist = Math.hypot(tx - hubX, ty - hubY);
      const sag = dist * 0.14;
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        pts.push({ x: lerp(hubX, tx, t), y: lerp(hubY, ty, t) + Math.sin(Math.PI * t) * sag, s: 1 });
      }
      return buildPoly(pts);
    });
    suspenders = grounds.map((g, i) => {
      const [tx, ty] = towerXY[g.tower];
      const [gx, gy] = groundXY[i];
      return buildPoly([
        { x: tx, y: ty, s: 1 },
        { x: gx, y: gy, s: 1 },
      ]);
    });
    routes = grounds.map((g, i) => {
      const sus = suspenders[i];
      const cab = cables[g.tower];
      const pts: { x: number; y: number; s: number }[] = [];
      for (let k = sus.x.length - 1; k >= 0; k--) pts.push({ x: sus.x[k], y: sus.y[k], s: 1 });
      for (let k = cab.x.length - 2; k >= 0; k--) pts.push({ x: cab.x[k], y: cab.y[k], s: 1 });
      return buildPoly(pts);
    });

    populate();
    tctx.clearRect(0, 0, cw, ch);
  }

  function populate() {
    const area = (cw * ch) / (1440 * 900);
    const density = clamp(Math.sqrt(area), 0.55, 1.25);

    vehicles.length = 0;
    scene.lanes.forEach((lane, li) => {
      const len = lanePolys[li].len;
      const n = Math.max(2, Math.round(lane.count * density));
      for (let i = 0; i < n; i++) {
        vehicles.push({ lane: li, d: ((i + rand() * 0.8) / n) * len, seed: rand() * 100, brake: 0, px: 0, py: 0, live: false });
      }
    });

    walkers.length = 0;
    scene.walks.forEach((w, wi) => {
      const n = Math.max(2, Math.round(w.count * density));
      for (let i = 0; i < n; i++) {
        walkers.push({
          walk: wi,
          d: rand() * walkPolys[wi].len,
          dir: i % 2 ? 1 : -1,
          seed: rand() * 100,
          pause: 0,
          px: 0,
          py: 0,
          live: false,
        });
      }
    });

    motes.length = 0;
    const [bu0, bv0, bu1, bv1] = bounds;
    const count = routes.length ? Math.round(clamp(170 * area, 70, 220)) : 0;
    for (let i = 0; i < count; i++) {
      const [cx, cy] = map(lerp(bu0, bu1, rand()), lerp(bv0, bv1, rand()));
      motes.push({
        cx,
        cy,
        route: Math.floor(rand() * routes.length),
        t: rand(),
        speed: 60 + rand() * 50,
        delay: rand(),
        seed: rand() * 100,
        px: 0,
        py: 0,
        live: false,
      });
    }
    signals.length = 0;
  }

  // ---------------------------------------------------------------- update

  function laneOrderFactor(v: Vehicle, laneVehicles: Vehicle[], len: number) {
    // Even out spacing: speed up when the gap ahead is larger than the gap behind.
    const n = laneVehicles.length;
    if (n < 2) return 1;
    const i = laneVehicles.indexOf(v);
    const dir = scene.lanes[v.lane].dir;
    const ahead = laneVehicles[(i + (dir === 1 ? 1 : n - 1)) % n];
    const behind = laneVehicles[(i + (dir === 1 ? n - 1 : 1)) % n];
    const wrap = (g: number) => ((g % len) + len) % len;
    const gapAhead = wrap((ahead.d - v.d) * dir);
    const gapBehind = wrap((v.d - behind.d) * dir);
    return 1 + 0.7 * clamp((gapAhead - gapBehind) / (len / n), -1, 1);
  }

  function update(dt: number) {
    time += dt;
    const step = dt / (target === 1 ? 3.6 : 2.4);
    const before = smooth(order);
    order = target === 1 ? Math.min(1, order + step) : Math.max(0, order - step);
    const o = smooth(order);
    // The moment the system takes hold: one ring of light from the hub.
    if (scene.hub && target === 1 && before < 0.3 && o >= 0.3) ignite = 0;
    if (ignite >= 0) ignite = ignite > 2.6 ? -1 : ignite + dt;
    const chaos = 1 - o;
    hubFlash = Math.max(0, hubFlash - dt * 1.6);

    // Vehicles
    const byLane: Vehicle[][] = scene.lanes.map(() => []);
    for (const v of vehicles) byLane[v.lane].push(v);
    for (const list of byLane) list.sort((a, b) => a.d - b.d);

    for (const v of vehicles) {
      const lane = scene.lanes[v.lane];
      const poly = lanePolys[v.lane];
      sample(poly, v.d, tmp);
      if (chaos > 0.05 && v.brake <= 0 && rand() < dt * 0.35 * chaos) v.brake = 0.5 + rand() * 1.2;
      v.brake = Math.max(0, v.brake - dt);
      const surge = 1 + 0.85 * (Math.sin(time * 0.9 + v.seed) * 0.6 + Math.sin(time * 2.3 + v.seed * 1.7) * 0.4);
      const chaotic = v.brake > 0 ? 0.08 : Math.max(0.15, surge);
      const factor = lerp(chaotic, laneOrderFactor(v, byLane[v.lane], poly.len), o);
      const speed = lane.speed * dw * tmp.s * factor;
      v.d += speed * dt * lane.dir;
      if (v.d > poly.len) {
        v.d -= poly.len;
        v.live = false;
      } else if (v.d < 0) {
        v.d += poly.len;
        v.live = false;
      }
    }

    // People
    for (const w of walkers) {
      const poly = walkPolys[w.walk];
      if (chaos > 0.1 && w.pause <= 0 && rand() < dt * 0.4 * chaos) {
        w.pause = 0.4 + rand() * 1.4;
        if (rand() < 0.5) w.dir *= -1;
      }
      w.pause = Math.max(0, w.pause - dt);
      sample(poly, w.d, tmp);
      const walking = w.pause > 0 ? 0 : 1;
      w.d += 0.0055 * dw * tmp.s * walking * w.dir * dt * lerp(1 + Math.sin(time + w.seed) * 0.5, 1, o);
      if (w.d > poly.len || w.d < 0) {
        w.d = ((w.d % poly.len) + poly.len) % poly.len;
        w.live = false;
      }
    }

    // Motes: wander a flow field in chaos, ride the cables in order.
    for (const m of motes) {
      const a =
        Math.sin(m.cx * 0.0042 + time * 0.35 + m.seed) * 2.2 +
        Math.cos(m.cy * 0.0051 - time * 0.27 + m.seed * 0.5) * 2.2 +
        Math.sin(time * 1.7 + m.seed * 3) * 0.9;
      const sp = 34 + 58 * (0.5 + 0.5 * Math.sin(time * 0.6 + m.seed));
      m.cx += Math.cos(a) * sp * dt;
      m.cy += Math.sin(a) * sp * dt * 0.7;
      const [x0, y0] = map(bounds[0], bounds[1]);
      const [x1, y1] = map(bounds[2], bounds[3]);
      if (m.cx < x0) m.cx = x1;
      if (m.cx > x1) m.cx = x0;
      if (m.cy < y0) m.cy = y1;
      if (m.cy > y1) m.cy = y0;
      const route = routes[m.route];
      m.t += (m.speed * dt) / Math.max(1, route.len);
      if (m.t >= 1) {
        m.t -= 1;
        m.live = false;
        if (o > 0.6) hubFlash = Math.min(1, hubFlash + 0.12);
      }
    }

    // Inquiries: demand is constant; how it is handled changes.
    signalClock -= dt;
    if (signalClock <= 0 && zones.length && groundXY.length) {
      signalClock = 0.14 + rand() * 0.22;
      const zone = zones[Math.floor(rand() * zones.length)];
      const [x, y] = map(lerp(zone[0], zone[2], rand()), lerp(zone[1], zone[3], rand()));
      if (x > -20 && x < cw + 20 && y > -20 && y < ch + 20 && !inQuiet(x, y)) {
        let best = 0;
        let bestD = Infinity;
        groundXY.forEach(([gx, gy], i) => {
          const d = Math.hypot(gx - x, gy - y);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        signals.push({ x, y, age: 0, life: 2.1, answered: rand() < o, ground: best });
      }
    }
    for (let i = signals.length - 1; i >= 0; i--) {
      signals[i].age += dt;
      if (signals[i].age > signals[i].life) signals.splice(i, 1);
    }

    // Tangles appear only while there is no system.
    tangleClock -= dt;
    if (tangleClock <= 0 && chaos > 0.15 && routes.length) {
      tangleClock = 0.06 + rand() * 0.12;
      const [u0, v0, u1, v1] = bounds;
      const pa = map(lerp(u0, u1, rand()), lerp(v0, v1, rand()));
      const ang = rand() * Math.PI * 2;
      const len = (0.05 + rand() * 0.16) * dw;
      tangles.push({ a: pa[0], b: pa[1], c: pa[0] + Math.cos(ang) * len, d: pa[1] + Math.sin(ang) * len * 0.6, age: 0, life: 0.35 + rand() * 0.6 });
    }
    for (let i = tangles.length - 1; i >= 0; i--) {
      tangles[i].age += dt;
      if (tangles[i].age > tangles[i].life) tangles.splice(i, 1);
    }

    // Aircraft
    planeClock -= dt;
    if (planeClock <= 0 && planes.length < 2 && flights.length) {
      planes.push({ flight: nextFlight, t: 0, dur: 30 + rand() * 10, px: 0, py: 0, live: false });
      nextFlight = (nextFlight + 1) % flights.length;
      planeClock = 12 + rand() * 9;
    }
    for (let i = planes.length - 1; i >= 0; i--) {
      planes[i].t += dt / planes[i].dur;
      if (planes[i].t >= 1) planes.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- draw

  function drawTrails(dt: number, o: number) {
    const chaos = 1 - o;
    // Exposure fade: slightly longer, calmer trails once the system holds.
    const base = lerp(0.075, 0.11, o);
    const fade = 1 - Math.pow(1 - base, dt * 60);
    tctx.globalCompositeOperation = 'destination-out';
    tctx.fillStyle = `rgba(0,0,0,${fade.toFixed(3)})`;
    tctx.fillRect(0, 0, cw, ch);
    tctx.globalCompositeOperation = 'lighter';
    tctx.lineCap = 'round';

    // Traffic
    for (const v of vehicles) {
      const lane = scene.lanes[v.lane];
      const poly = lanePolys[v.lane];
      sample(poly, v.d, tmp);
      const weave = chaos * Math.sin(time * 1.6 + v.seed) * 2.2 * tmp.s;
      const off = lane.offset * dw * tmp.s + weave;
      const x = tmp.x + tmp.nx * off;
      const y = tmp.y + tmp.ny * off;
      const edge = Math.min(v.d, poly.len - v.d) / (poly.len * 0.06);
      const a = clamp(edge) * (lane.kind === 'tail' ? 0.85 : 0.75);
      if (v.live && a > 0.01) {
        const braking = lane.kind === 'tail' && v.brake > 0;
        const color = lane.kind === 'tail' ? TAIL_RED : WARM_WHITE;
        tctx.strokeStyle = rgba(color, a);
        tctx.lineWidth = Math.max(0.7, 2.1 * tmp.s) * (braking ? 1.5 : 1);
        tctx.beginPath();
        tctx.moveTo(v.px, v.py);
        tctx.lineTo(x, y);
        tctx.stroke();
        const g = lane.kind === 'tail' ? glow.red : glow.warm;
        const r = (braking ? 18 : 11) * Math.max(0.35, tmp.s);
        tctx.globalAlpha = a * (braking ? 1 : 0.7);
        tctx.drawImage(g, x - r, y - r, r * 2, r * 2);
        tctx.globalAlpha = 1;
      }
      v.px = x;
      v.py = y;
      v.live = true;
    }

    // People
    tctx.fillStyle = rgba([255, 214, 168], 0.85);
    for (const w of walkers) {
      const poly = walkPolys[w.walk];
      sample(poly, w.d, tmp);
      const off = scene.walks[w.walk].offset * dw * tmp.s;
      const x = tmp.x + tmp.nx * off;
      const y = tmp.y + tmp.ny * off;
      const r = Math.max(0.6, 1.3 * tmp.s);
      tctx.fillRect(x - r / 2, y - r / 2, r, r);
      w.px = x;
      w.py = y;
      w.live = true;
    }

    // Motes: chaos swarm → cable flow
    for (const m of motes) {
      const lo = smooth((o - m.delay * 0.45) / 0.55);
      sample(routes[m.route], m.t * routes[m.route].len, tmp);
      const x = lerp(m.cx, tmp.x, lo);
      const y = lerp(m.cy, tmp.y, lo);
      const jump = Math.hypot(x - m.px, y - m.py);
      if (m.live && jump < 60) {
        const c: RGB = [lerp(AMBER[0], IVORY[0], lo), lerp(AMBER[1], IVORY[1], lo), lerp(AMBER[2], IVORY[2], lo)];
        tctx.strokeStyle = rgba(c, lerp(0.8, 0.85, lo));
        tctx.lineWidth = lerp(1.5, 1.3, lo);
        tctx.beginPath();
        tctx.moveTo(m.px, m.py);
        tctx.lineTo(x, y);
        tctx.stroke();
        const gr = lerp(7, 5, lo);
        tctx.globalAlpha = lerp(0.45, 0.35, lo);
        tctx.drawImage(lo > 0.5 ? glow.ivory : glow.amber, x - gr, y - gr, gr * 2, gr * 2);
        tctx.globalAlpha = 1;
      }
      m.px = x;
      m.py = y;
      m.live = true;
    }

    // Aircraft trails
    for (const p of planes) {
      const f = flights[p.flight];
      const [x, y] = map(lerp(f.from[0], f.to[0], p.t), lerp(f.from[1], f.to[1], p.t));
      if (p.live) {
        tctx.strokeStyle = 'rgba(255,255,255,0.28)';
        tctx.lineWidth = 1;
        tctx.beginPath();
        tctx.moveTo(p.px, p.py);
        tctx.lineTo(x, y);
        tctx.stroke();
      }
      p.px = x;
      p.py = y;
      p.live = true;
    }
    tctx.globalCompositeOperation = 'source-over';
    soften(tctx, 1 - Math.pow(1 - 0.3, dt * 60));
  }

  function strokePartial(poly: Poly, p: number) {
    if (p <= 0) return;
    const end = poly.len * clamp(p);
    octx.beginPath();
    octx.moveTo(poly.x[0], poly.y[0]);
    for (let i = 1; i < poly.x.length; i++) {
      if (poly.cum[i] <= end) {
        octx.lineTo(poly.x[i], poly.y[i]);
      } else {
        sample(poly, end, tmp);
        octx.lineTo(tmp.x, tmp.y);
        break;
      }
    }
    octx.stroke();
  }

  function drawOverlay(o: number) {
    octx.clearRect(0, 0, cw, ch);

    // Network: cables unspool from the hub, then suspenders drop to the city.
    octx.lineWidth = 1;
    cables.forEach((c, i) => {
      const p = (o - 0.1 - i * 0.035) / 0.4;
      octx.strokeStyle = rgba(IVORY, 0.34 * clamp(p * 1.5));
      strokePartial(c, p);
    });
    suspenders.forEach((s, i) => {
      const p = (o - 0.38 - i * 0.02) / 0.35;
      octx.strokeStyle = rgba(IVORY, 0.24 * clamp(p * 1.5));
      strokePartial(s, p);
    });
    towerXY.forEach(([x, y], i) => {
      const a = clamp((o - 0.3 - i * 0.035) / 0.2);
      if (a <= 0) return;
      octx.strokeStyle = rgba(IVORY, 0.8 * a);
      octx.strokeRect(x - 3, y - 3, 6, 6);
    });
    groundXY.forEach(([x, y], i) => {
      const a = clamp((o - 0.55 - i * 0.02) / 0.2);
      if (a <= 0) return;
      octx.fillStyle = rgba(IVORY, 0.65 * a);
      octx.fillRect(x - 1.5, y - 1.5, 3, 3);
    });

    // Ignition: two thin rings sweep out across the city, once.
    if (ignite >= 0) {
      const maxR = Math.hypot(Math.max(hubX, cw - hubX), Math.max(hubY, ch - hubY));
      for (const lag of [0, 0.28]) {
        const k = clamp((ignite - lag) / 2.2);
        if (k <= 0 || k >= 1) continue;
        const r = (1 - Math.pow(1 - k, 3)) * maxR;
        octx.strokeStyle = rgba(IVORY, 0.42 * (1 - k) * (lag ? 0.6 : 1));
        octx.lineWidth = lag ? 1 : 1.5;
        octx.beginPath();
        octx.arc(hubX, hubY, r, 0, Math.PI * 2);
        octx.stroke();
      }
      octx.lineWidth = 1;
    }

    // Hub: International Orange, pulsing as each routed inquiry arrives.
    const ha = scene.hub ? clamp((o - 0.05) / 0.3) : 0;
    if (ha > 0) {
      const r = 9 + hubFlash * 10;
      octx.globalCompositeOperation = 'lighter';
      octx.globalAlpha = ha * (0.5 + hubFlash * 0.5);
      octx.drawImage(glow.orange, hubX - r * 2, hubY - r * 2, r * 4, r * 4);
      octx.globalAlpha = 1;
      octx.globalCompositeOperation = 'source-over';
      octx.fillStyle = rgba(ORANGE, ha);
      octx.fillRect(hubX - 4, hubY - 4, 8, 8);
      if (hubFlash > 0.02) {
        const s = 8 + (1 - hubFlash) * 18;
        octx.strokeStyle = rgba(ORANGE, hubFlash * 0.7 * ha);
        octx.strokeRect(hubX - s / 2, hubY - s / 2, s, s);
      }
    }

    // Tangled, flickering links, tools that don't talk to each other.
    const chaos = 1 - o;
    if (chaos > 0.02) {
      octx.lineWidth = 1;
      for (const t of tangles) {
        const k = t.age / t.life;
        const flicker = 0.55 + 0.45 * Math.sin((t.age + t.a) * 38);
        octx.strokeStyle = rgba(AMBER, 0.32 * chaos * (1 - k) * flicker);
        octx.beginPath();
        octx.moveTo(t.a, t.b);
        const mx = (t.a + t.c) / 2 + Math.sin(t.age * 9 + t.b) * 14;
        const my = (t.b + t.d) / 2 + Math.cos(t.age * 7 + t.a) * 10;
        octx.quadraticCurveTo(mx, my, lerp(t.a, t.c, clamp(k * 3)), lerp(t.b, t.d, clamp(k * 3)));
        octx.stroke();
      }
    }

    // Inquiries
    for (const s of signals) {
      const k = s.age / s.life;
      const ring = 3 + (1 - Math.pow(1 - clamp(s.age / 1.0), 3)) * 22;
      if (s.answered) {
        const [gx, gy] = groundXY[s.ground];
        const draw = clamp(s.age / 0.35);
        octx.strokeStyle = rgba(IVORY, 0.55 * (1 - k));
        octx.beginPath();
        octx.moveTo(s.x, s.y);
        octx.lineTo(lerp(s.x, gx, draw), lerp(s.y, gy, draw));
        octx.stroke();
        octx.strokeStyle = rgba(IVORY, 0.5 * (1 - k));
        octx.beginPath();
        octx.arc(s.x, s.y, ring, 0, Math.PI * 2);
        octx.stroke();
        octx.fillStyle = rgba(IVORY, 0.95 * (1 - k * 0.6));
        octx.fillRect(s.x - 1.8, s.y - 1.8, 3.6, 3.6);
      } else {
        const lost = clamp((s.age - 0.7) / 0.5);
        const c: RGB = [lerp(AMBER[0], MISSED[0], lost), lerp(AMBER[1], MISSED[1], lost), lerp(AMBER[2], MISSED[2], lost)];
        octx.lineWidth = 1.2;
        octx.strokeStyle = rgba(AMBER, 0.8 * (1 - clamp(s.age / 1.1)));
        octx.beginPath();
        octx.arc(s.x, s.y, ring, 0, Math.PI * 2);
        octx.stroke();
        octx.lineWidth = 1;
        octx.globalCompositeOperation = 'lighter';
        octx.globalAlpha = 0.7 * (1 - lost);
        octx.drawImage(glow.amber, s.x - 9, s.y - 9, 18, 18);
        octx.globalAlpha = 1;
        octx.globalCompositeOperation = 'source-over';
        octx.fillStyle = rgba(c, 0.95 * (1 - k));
        octx.beginPath();
        octx.arc(s.x, s.y, 2.6 * (1 - lost * 0.45), 0, Math.PI * 2);
        octx.fill();
      }
    }

    // Aircraft: landing light, red beacon, white strobe.
    octx.globalCompositeOperation = 'lighter';
    for (const p of planes) {
      if (!p.live) continue;
      octx.globalAlpha = 0.85;
      octx.drawImage(glow.warm, p.px - 7, p.py - 7, 14, 14);
      const beacon = Math.sin(time * Math.PI * 2 * 0.9) > 0.6;
      if (beacon) {
        octx.globalAlpha = 0.9;
        octx.drawImage(glow.red, p.px - 5, p.py - 9, 10, 10);
      }
      const strobe = (time + p.flight * 0.37) % 1.3 < 0.07;
      if (strobe) {
        octx.globalAlpha = 1;
        octx.drawImage(glow.ivory, p.px - 11, p.py - 11, 22, 22);
      }
      octx.globalAlpha = 1;
    }
    octx.globalCompositeOperation = 'source-over';
    soften(octx, 0.88);
  }

  // ---------------------------------------------------------------- loop

  function frame(now: number) {
    raf = 0;
    const dt = Math.min(1 / 30, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    update(dt);
    const o = smooth(order);
    drawTrails(dt, o);
    drawOverlay(o);
    onFrame?.(o, time);
    schedule();
  }

  function schedule() {
    if (!raf && !paused && visible && !reducedMotion && !document.hidden) {
      raf = requestAnimationFrame(frame);
    } else if (raf === 0) {
      last = 0;
    }
  }

  /** Render a single still (reduced motion): simulate a moment, keep the exposure. */
  function still() {
    order = target;
    tctx.clearRect(0, 0, cw, ch);
    for (let i = 0; i < 150; i++) {
      update(1 / 60);
      drawTrails(1 / 60, smooth(order));
    }
    drawOverlay(smooth(order));
    onFrame?.(smooth(order), 0);
  }

  // Observers
  const ro = new ResizeObserver(() => {
    layout();
    if (reducedMotion) still();
  });
  ro.observe(host);
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  });
  io.observe(host);
  const onVisibility = () => schedule();
  document.addEventListener('visibilitychange', onVisibility);
  const onLoad = () => {
    layout();
    if (reducedMotion) still();
  };
  if (!img.complete) img.addEventListener('load', onLoad, { once: true });

  layout();
  if (reducedMotion) still();
  else schedule();

  return {
    setTarget(next, immediate = false) {
      target = next;
      if (immediate) order = next;
      if (reducedMotion) still();
      else schedule();
    },
    setQuietZone(zone) {
      quiet = zone;
    },
    setPaused(p) {
      paused = p;
      if (p && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      schedule();
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      img.removeEventListener('load', onLoad);
    },
  };
}
