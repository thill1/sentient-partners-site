import { useEffect, useRef } from "react";
import { planVessel, vesselAt, type Vessel, type VesselKind, type WaterView } from "./boatModel";
import { activeScene } from "./sceneTime";

// Photographic alpha cutouts; source rectangles exclude neighboring vessels.
const sprites: Record<VesselKind, [number, number, number, number]> = {
  sloop: [18, 248, 365, 556],
  yacht: [390, 113, 439, 691],
  cargo: [842, 484, 686, 329],
};

export default function Boats() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const image = new Image();
    image.src = "/atmosphere/vessels.png";
    let fleet: Vessel[] = [];
    let width = 0, height = 0, ratio = 1, scale = 1;
    let offsetX = 0, offsetY = 0;
    let frame = 0, previous = 0, now = 0, visible = true;
    let brightness = activeScene() === "night" ? 0.3 : 0.85;
    let view: WaterView = { left: 0, right: 1536 };

    const paint = (vessel: Vessel) => {
      const { x, y, alpha } = vesselAt(vessel, now);
      if (alpha <= 0 || !image.complete || !image.naturalWidth) return;
      const [sx, sy, sw, sh] = sprites[vessel.kind];
      const w = vessel.width, h = w * sh / sw;
      const direction = Math.sign(vessel.speed);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(direction, 1);
      // Narrow, broken wake trails the stern and fades into the water.
      const wake = ctx.createLinearGradient(-w * 2.3, 0, -w * 0.35, 0);
      wake.addColorStop(0, "rgba(199,217,218,0)");
      wake.addColorStop(1, `rgba(199,217,218,${0.22 * brightness})`);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = wake;
      ctx.lineWidth = vessel.kind === "cargo" ? 0.7 : 0.45;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-w * 0.35, 0.2);
        const ripple = Math.sin(now * 1.1 + vessel.phase + side) * 0.6;
        ctx.bezierCurveTo(-w * 0.8, side * 1.2, -w * 1.5, side * (2.6 + ripple), -w * 2.3, side * 4.4);
        ctx.stroke();
      }
      // A compressed reflection, broken into ripples rather than a mirror.
      ctx.save();
      ctx.scale(1, -0.2);
      ctx.globalAlpha = alpha * 0.12 * brightness;
      for (let row = 0; row < 5; row++) {
        const sourceY = sh * (1 - (row + 1) / 5);
        ctx.drawImage(image, sx, sy + sourceY, sw, sh / 8,
          -w / 2 + Math.sin(now + row) * 0.4, -h + sourceY / sh * h, w, h / 8);
      }
      ctx.restore();
      ctx.globalAlpha = alpha * (vessel.kind === "cargo" ? 0.86 : 0.94);
      ctx.filter = `brightness(${brightness}) saturate(0.65)`;
      ctx.drawImage(image, sx, sy, sw, sh, -w / 2, -h + 0.7, w, h);
      ctx.filter = "none";
      if (brightness < 0.65) {
        ctx.globalAlpha = alpha * (0.65 - brightness);
        ctx.fillStyle = "#ffe2b5";
        ctx.fillRect(-w * 0.28, -h * (vessel.kind === "cargo" ? 0.61 : 0.2), 0.9, 0.7);
      }
      ctx.restore();
    };
    const render = () => {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      fleet.forEach(paint);
      canvas.dataset.vessels = fleet.map((v) => v.kind).join(",");
    };
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (time - previous < 40) return;
      const dt = previous ? (time - previous) / 1000 : 0;
      previous = time;
      now += dt;
      const scene = activeScene();
      const target = scene === "night" ? 0.3 : scene === "day" ? 1 : 0.8;
      brightness += (target - brightness) * Math.min(1, dt * 1.6);
      fleet = fleet.map((vessel, slot) => now > vessel.born + vessel.life
        ? planVessel(Math.random, now + 12 + Math.random() * 28, slot, view)
        : vessel);
      render();
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (visible && !document.hidden && width > 0) frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      ratio = Math.min(devicePixelRatio, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const bay = canvas.closest(".scene")?.querySelector(".scene-bay");
      const focus = bay ? getComputedStyle(bay).objectPosition.split(" ") : ["64%", "48%"];
      const position = (value: string) => value === "center" ? 0.5 : parseFloat(value) / 100;
      scale = Math.max(width / 1536, height / 1024);
      offsetX = (width - 1536 * scale) * position(focus[0]);
      offsetY = (height - 1024 * scale) * position(focus[1]);
      const box = canvas.getBoundingClientRect();
      const k = width / Math.max(1, box.width);
      view = { left: (-box.left * k - offsetX) / scale,
        right: ((innerWidth - box.left) * k - offsetX) / scale,
        compact: innerWidth <= 600 };
      const count = innerWidth <= 600 ? 2 : 3;
      // Replan on viewport changes so boats remain in the visible bay crop.
      fleet = Array.from({ length: count }, (_, slot) => {
        const vessel = planVessel(Math.random, now, slot, view);
        return { ...vessel, born: now - vessel.life * (0.28 + Math.random() * 0.4) };
      });
      render();
      schedule();
    };
    image.onload = render;
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
      image.onload = null;
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", schedule);
    };
  }, []);
  return <canvas ref={ref} className="scene-boats" aria-hidden="true" />;
}
