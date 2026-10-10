import { useEffect, useRef } from "react";
import {
  laneDistance,
  roadPoint,
  stepLane,
  trafficProfile,
  vehicleSizes,
  type Lane,
  type Vehicle,
} from "./trafficModel";
import { activeScene, easeLighting, sceneLighting } from "./sceneTime";

/** Small solid, shaded vehicles, drawn in the same cover projection as the bridge. */
export default function Traffic() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let profile = trafficProfile(),
      nextProfile = 0;
    let lighting = { ...sceneLighting[activeScene()] };
    let visible = true,
      frame = 0,
      previous = 0;
    let width = 0,
      height = 0,
      ratio = 1;
    // Lanes 0-2 run toward the city on the far side of the deck, 3-5 toward Marin.
    const lanes: (Lane & { index: number })[] = Array.from(
      { length: 6 },
      (_, index) => ({
        index,
        direction: index < 3 ? -1 : 1,
        cars: [],
        arrival: Math.random() * 3,
      }),
    );
    // Arrive mid-stream: the deck is already busy on first paint.
    for (let t = 0; t < 150; t += 0.25)
      lanes.forEach((lane) => stepLane(lane, 0.25, profile));
    const polygon = (points: number[][], fill: string | CanvasGradient) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };
    // A point across the deck, in lane widths: 0-5 are the lanes, beyond them the railings.
    const deckPoint = (distance: number, lane: number) => {
      const point = roadPoint(distance);
      // Lane centres fitted to the painted deck: the projection's scale runs
      // narrow and low toward the far tower, so the far end is widened and raised.
      const far = (1 - (point.scale - 0.08) / 0.92) ** 2;
      const offset =
        ((lane - 2.5) * 7.4 * (1 + 0.5 * far) - 3.5) * point.scale - 16 * far;
      return {
        ...point,
        x: point.x - Math.sin(point.angle) * offset,
        y: point.y + Math.cos(point.angle) * offset,
      };
    };
    const paint = (car: Vehicle, lane: (typeof lanes)[number]) => {
      const distance = laneDistance(lane, car);
      const point = deckPoint(distance, lane.index),
        [length, breadth, tall] = vehicleSizes[car.kind];
      const { x, y } = point;
      // Fade beneath the approach/shoreline. The near tower column masks passing traffic.
      const alpha = Math.min(1, distance * 35, (1 - distance) * 55);
      if (alpha <= 0) return;
      // Footprint follows the deck; height rises straight up the screen, so
      // tall vehicles stand upright instead of leaning toward the camera.
      const k = point.scale,
        ca = Math.cos(point.angle) * k,
        sa = Math.sin(point.angle) * k;
      const at = (u: number, v: number, z: number) => [
        x + u * ca - v * sa,
        y + u * sa + v * ca - z * k,
      ];
      const h = tall * 0.68,
        l = length / 2,
        b = breadth / 2;
      const front = lane.direction > 0 ? 1 : -1;
      // Drivers switch on one by one as the light goes: a stable share of the fleet.
      const headlights =
        lighting.headlights *
        Math.max(0, Math.min(1, (lighting.litShare - (car.phase % 1)) * 8));
      // Faces whose outward normal points down the screen face the camera.
      const sideV = ca >= 0 ? b : -b,
        endU = sa >= 0 ? l : -l;
      const side = (
        u0: number,
        u1: number,
        z0: number,
        z1: number,
        fill: string,
      ) =>
        polygon(
          [
            at(u0, sideV, z0),
            at(u1, sideV, z0),
            at(u1, sideV, z1),
            at(u0, sideV, z1),
          ],
          fill,
        );
      const end = (
        v0: number,
        v1: number,
        z0: number,
        z1: number,
        fill: string,
      ) =>
        polygon(
          [
            at(endU, v0, z0),
            at(endU, v1, z0),
            at(endU, v1, z1),
            at(endU, v0, z1),
          ],
          fill,
        );
      const roof = (
        u0: number,
        u1: number,
        v0: number,
        v1: number,
        fill: string,
        z = h,
      ) =>
        polygon(
          [at(u0, v0, z), at(u1, v0, z), at(u1, v1, z), at(u0, v1, z)],
          fill,
        );
      // Forward along the vehicle, measured from its nose (0) to its tail (1).
      const fromNose = (f: number) => front * (l - f * length);
      ctx.save();
      ctx.globalAlpha = alpha * 0.93;
      roof(-l - 1, l + 1, -b + 1, b + 2, "#14202b88", 0);
      side(-l, l, 0, h, car.color);
      side(-l, l, 0, h, "#0a121a80");
      end(-b, b, 0, h, car.color);
      end(-b, b, 0, h, "#0a121a55");
      roof(-l, l, -b, b, car.color);
      const glass = "#172832";
      if (car.kind === "box" || car.kind === "semi") {
        // Cab ahead of the load; a semi's trailer is a separate box.
        const cab = car.kind === "semi" ? 0.15 : 0.22;
        roof(fromNose(cab), fromNose(cab + 0.03), -b, b, "#8a969a");
        side(fromNose(0.02), fromNose(cab - 0.02), h * 0.55, h * 0.85, glass);
        if (endU * front > 0) end(-b * 0.8, b * 0.8, h * 0.55, h * 0.85, glass);
        if (car.kind === "semi")
          roof(fromNose(0.5), fromNose(0.52), -b, b, "#5d666a");
      } else if (car.kind === "bus") {
        side(-l + 2, l - 2, h * 0.5, h * 0.82, glass);
        if (endU * front > 0)
          end(-b * 0.85, b * 0.85, h * 0.45, h * 0.88, glass);
      } else {
        // Glasshouse: windscreen and side windows around a body-coloured roof.
        side(fromNose(0.3), fromNose(0.75), h * 0.58, h * 0.92, glass);
        roof(fromNose(0.3), fromNose(0.38), -b + 0.6, b - 0.6, glass);
        if (endU * front > 0) end(-b * 0.8, b * 0.8, h * 0.58, h * 0.9, glass);
        if (car.kind === "pickup")
          roof(fromNose(0.62), fromNose(0.97), -b + 0.7, b - 0.7, "#323e44");
      }
      const axles =
        car.kind === "semi"
          ? [0.1, 0.3, 0.8, 0.92]
          : car.kind === "bus"
            ? [0.15, 0.8]
            : [0.2, 0.78];
      for (const f of axles)
        side(fromNose(f) - 1, fromNose(f) + 1, -0.3, h * 0.28, "#1b2226");
      // Lamps sit at the corners of each end, low on the body.
      const lampZ = h * 0.28,
        lampV = b * 0.7;
      const noseU = front * l,
        tailU = -front * l;
      ctx.globalCompositeOperation = "lighter";
      // Headlight throw on the deck ahead, visible from either side.
      const beam = ctx.createLinearGradient(
        ...(at(noseU, 0, 0) as [number, number]),
        ...(at(noseU + front * 36, 0, 0) as [number, number]),
      );
      beam.addColorStop(0, `rgba(255, 220, 150, ${0.55 * headlights})`);
      beam.addColorStop(1, "rgba(255, 220, 150, 0)");
      polygon(
        [
          at(noseU, -lampV, 0),
          at(noseU + front * 36, -b * 2.2, 0),
          at(noseU + front * 36, b * 2.2, 0),
          at(noseU, lampV, 0),
        ],
        beam,
      );
      // A crisp core inside a soft halo, so lamps read as points of light.
      const lamp = (u: number, colour: string, size: number) => {
        for (const v of [-lampV, lampV]) {
          const [lx, ly] = at(u, v, lampZ);
          const r = Math.max(3, size * k);
          const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, r);
          glow.addColorStop(0, colour);
          glow.addColorStop(0.18, colour);
          glow.addColorStop(0.4, colour.replace(/[\d.]+\)$/, "0.35)"));
          glow.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = glow;
          ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
        }
      };
      if (endU === noseU && headlights > 0.02)
        lamp(noseU, `rgba(255, 230, 168, ${headlights})`, 8);
      if (endU === tailU && (car.hesitate > 0 || headlights > 0.02))
        lamp(
          tailU,
          car.hesitate > 0
            ? "rgba(255, 70, 50, 0.95)"
            : `rgba(220, 60, 44, ${0.8 * headlights})`,
          4,
        );
      ctx.restore();
    };
    // Aviation obstruction beacons on each tower leg (artwork coordinates, radius).
    const beacons: [number, number, number][] = [
      [1071, 113, 1],
      [1143, 116, 1],
      [574, 198, 0.55],
      [602, 198, 0.55],
    ];
    const paintBeacons = (seconds: number) => {
      // A slow red flash, about thirty a minute: brief rise, soft fall, never fully dark.
      const phase = (seconds % 2) / 2;
      const flash =
        0.18 +
        0.82 * (phase < 0.12 ? phase / 0.12 : Math.exp(-(phase - 0.12) * 4));
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const [x, y, size] of beacons) {
        const halo = 16 * size;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, halo);
        glow.addColorStop(0, `rgba(255, 40, 24, ${flash})`);
        glow.addColorStop(0.2, `rgba(245, 30, 18, ${0.7 * flash})`);
        glow.addColorStop(0.55, `rgba(210, 20, 12, ${0.2 * flash})`);
        glow.addColorStop(1, "rgba(200, 30, 20, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(x - halo, y - halo, halo * 2, halo * 2);
        ctx.fillStyle = `rgba(255, 92, 70, ${flash})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.9 * size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };
    // Sodium lamps along both railings, warming up as the light fails.
    const paintDeckLamps = () => {
      if (lighting.deckLamps < 0.02) return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let d = 0.03; d < 0.985; d += 0.024)
        for (const side of [-1.3, 6.3]) {
          const p = deckPoint(d, side);
          const lx = p.x,
            ly = p.y - 9 * p.scale;
          // A small sodium point with a tight glow, so the lamps read as a
          // string of lights rather than competing with the traffic.
          const r = 1 + 4 * p.scale;
          const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, r);
          glow.addColorStop(
            0,
            `rgba(255, 214, 150, ${0.8 * lighting.deckLamps})`,
          );
          glow.addColorStop(
            0.22,
            `rgba(255, 180, 96, ${0.38 * lighting.deckLamps})`,
          );
          glow.addColorStop(1, "rgba(255, 150, 70, 0)");
          ctx.fillStyle = glow;
          ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
        }
      ctx.restore();
    };
    // The bridge image's own object-position, which changes with the layout.
    let focus = [0.64, 0.48];
    const readFocus = () => {
      const image = canvas.previousElementSibling;
      if (!(image instanceof HTMLImageElement)) return;
      const parts = getComputedStyle(image).objectPosition.split(" ");
      const keywords: Record<string, number> = {
        left: 0,
        top: 0,
        center: 0.5,
        right: 1,
        bottom: 1,
      };
      const value = (part: string | undefined, fallback: number) =>
        part?.endsWith("%")
          ? parseFloat(part) / 100
          : (keywords[part ?? ""] ?? fallback);
      focus = [value(parts[0], 0.64), value(parts[1], 0.48)];
    };
    const started = performance.now();
    const render = () => {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const scale = Math.max(width / 1536, height / 1024);
      // Matches object-fit: cover and the bridge image's object-position.
      ctx.translate(
        (width - 1536 * scale) * focus[0],
        (height - 1024 * scale) * focus[1],
      );
      ctx.scale(scale, scale);
      paintBeacons((performance.now() - started) / 1000);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 1536, 1024);
      ctx.rect(1053, 525, 30, 91);
      ctx.rect(567, 320, 10, 44);
      ctx.clip("evenodd");
      paintDeckLamps();
      // Far side first, so nearer lanes overlap it.
      lanes.forEach((lane) => lane.cars.forEach((car) => paint(car, lane)));
      ctx.restore();
      canvas.dataset.period = profile.period;
      canvas.dataset.vehicles = String(
        lanes.reduce((n, lane) => n + lane.cars.length, 0),
      );
    };
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (now - previous < 32) return;
      const dt = Math.min(0.1, (now - previous) / 1000);
      previous = now;
      lighting = easeLighting(lighting, dt);
      if (now > nextProfile) {
        profile = trafficProfile();
        nextProfile = now + 60000;
      }
      lanes.forEach((lane) => stepLane(lane, dt, profile));
      render();
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
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
      render();
      schedule();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    });
    intersection.observe(canvas);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", schedule);
    };
  }, []);
  return <canvas ref={ref} className="scene-traffic" aria-hidden="true" />;
}
