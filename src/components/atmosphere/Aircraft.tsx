import { useEffect, useRef } from "react";
import {
  FULL_VIEW,
  flightAt,
  nextGap,
  planFlight,
  type Flight,
  type SkyView,
} from "./airModel";
import { activeScene, easeLighting, sceneLighting } from "./sceneTime";

/**
 * Distant aircraft in the sky behind the bridge, drawn in the bay artwork's
 * cover projection on a layer beneath the distant fog and the bridge, so both
 * hide them naturally. On their own clock: scrolling never moves them.
 */
export default function Aircraft() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const random = Math.random;
    let flights: Flight[] = [];
    let lighting = { ...sceneLighting[activeScene()] };
    let width = 0,
      height = 0,
      ratio = 1,
      visible = true,
      frame = 0,
      previous = 0;
    const started = performance.now();
    const clock = () => (performance.now() - started) / 1000;
    // The bay image's own object-position, which changes with the layout.
    let focus = [0.64, 0.48];
    const readFocus = () => {
      const image = canvas.closest(".scene")?.querySelector(".scene-bay");
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
    // Artwork placement on the canvas (object-fit: cover), and the artwork
    // rows hidden under the navigation.
    let scale = 1,
      offset = [0, 0],
      headerTop = FULL_VIEW.top;
    const place = () => {
      scale = Math.max(width / 1536, height / 1024);
      offset = [
        (width - 1536 * scale) * focus[0],
        (height - 1024 * scale) * focus[1],
      ];
      // The canvas carries the bay's scroll transform; its box says where it is.
      const box = canvas.getBoundingClientRect();

      const k = width / Math.max(1, box.width);
      const toArt = (sx: number, sy: number) => [
        ((sx - box.left) * k - offset[0]) / scale,
        ((sy - box.top) * k - offset[1]) / scale,
      ];
      // The navigation's visible content, not its taller box.
      let bottom = 0;
      document
        .querySelectorAll(
          ".site-header .brand-lockup, .site-header .desktop-nav, .site-header .header-book",
        )
        .forEach((node) => {
          const r = node.getBoundingClientRect();
          if (r.height > 0) bottom = Math.max(bottom, r.bottom + 12);
        });
      headerTop = toArt(0, bottom)[1];
      const [left] = toArt(0, 0),
        [right] = toArt(innerWidth, 0);
      return { left, right, top: headerTop } satisfies SkyView;
    };
    const paint = (flight: Flight, now: number, lights: number) => {
      const { x, y, span, alpha } = flightAt(flight, now);
      // Lower routes sit deeper in the horizon haze; nothing shows under the
      // navigation, even as the descent lifts the sky toward it.
      const below = Math.max(0, Math.min(1, (y - headerTop) / 14));
      const haze = alpha * below * (y > 120 ? 0.7 : 0.85);
      if (haze <= 0.01) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.save();
      ctx.rotate(Math.atan2(flight.vy, Math.abs(flight.vx)));
      ctx.scale(Math.sign(flight.vx) * span, span);
      // A shallow three-quarter profile: swept wings, tapered fuselage,
      // upright tail and engine nacelles. Mirroring never inverts the tail.
      const night = lighting.stars;
      ctx.globalAlpha = haze * 0.94;
      ctx.fillStyle = night > 0.5 ? "#414957" : "#727d86";
      ctx.beginPath();
      ctx.moveTo(0.12, -0.035);
      ctx.lineTo(flight.kind === "light" ? -0.04 : -0.24, -0.27);
      ctx.lineTo(-0.29, -0.25);
      ctx.lineTo(-0.08, 0.01);
      ctx.lineTo(-0.3, 0.23);
      ctx.lineTo(-0.19, 0.24);
      ctx.lineTo(0.18, 0.02);
      ctx.closePath();
      ctx.fill();
      const body = ctx.createLinearGradient(0, -0.07, 0, 0.055);
      body.addColorStop(0, night > 0.5 ? "#7a8595" : "#ede5d6");
      body.addColorStop(0.55, night > 0.5 ? "#505c70" : "#c4c8c6");
      body.addColorStop(1, "#475667");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(-0.48, 0);
      ctx.lineTo(-0.42, -0.16);
      ctx.lineTo(-0.37, -0.16);
      ctx.lineTo(-0.3, -0.04);
      ctx.lineTo(0.31, -0.04);
      ctx.quadraticCurveTo(0.43, -0.04, 0.5, 0.012);
      ctx.quadraticCurveTo(0.4, 0.052, 0.27, 0.049);
      ctx.lineTo(-0.36, 0.035);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#455261";
      if (flight.kind !== "light") {
        ctx.beginPath();
        ctx.ellipse(-0.06, 0.11, 0.06, 0.025, -0.15, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillRect(0.32, -0.031, 0.055, 0.018);
      ctx.restore();
      ctx.globalCompositeOperation = "lighter";
      const dot = (colour: string, r: number, strength: number) => {
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        glow.addColorStop(0, colour);
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.globalAlpha = haze * strength * lights;
        ctx.fillStyle = glow;
        ctx.fillRect(-r, -r, r * 2, r * 2);
      };
      // Small and quick, so they never compete with the towers' slow red beacons.
      const t = (now + flight.phase * 3) % 1.3;
      if (t < 0.05 || (t > 0.15 && t < 0.2))
        dot("rgba(255, 255, 255, 1)", 1.4, 0.8);
      if (flight.kind !== "jet" && (now + flight.phase * 2) % 1.1 < 0.12)
        dot("rgba(255, 70, 60, 1)", 1.1, 0.6);
      if (flight.landingLight) dot("rgba(255, 244, 222, 1)", 1.8, 0.55);
      ctx.restore();
    };
    const render = () => {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      place();
      ctx.translate(offset[0], offset[1]);
      ctx.scale(scale, scale);
      const now = clock();
      flights.forEach((flight) => paint(flight, now, lighting.planeLights));
      canvas.dataset.flights = String(flights.length);
    };
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (time - previous < 32) return;
      lighting = easeLighting(
        lighting,
        Math.min(0.1, (time - previous) / 1000),
      );
      previous = time;
      const now = clock();
      flights = flights.filter((f) => now - f.born < f.life);
      if (now > nextSpawn) {
        nextSpawn = now + nextGap(random);
        const flight =
          flights.length < 2 ? planFlight(random, now, place()) : null;
        if (flight && !flights.some((f) => f.kind === flight.kind))
          flights.push(flight);
      }
      render();
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      if (visible && !document.hidden && width > 0)
        frame = requestAnimationFrame(draw);
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
    // Begin with one established flight, then let the normal sparse schedule run.
    let nextSpawn = nextGap(random);
    {
      const flight = planFlight(random, 0, place());
      if (flight)
        flights.push({
          ...flight,
          born: -flight.life * (0.2 + random() * 0.4),
        });
      nextSpawn = nextGap(random);
    }
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
  return <canvas ref={ref} className="scene-air" aria-hidden="true" />;
}
