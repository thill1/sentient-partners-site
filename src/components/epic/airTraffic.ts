/**
 * Live air traffic over the rendered film. Aircraft are not in the frames;
 * they are flown here on random paths, every visit different, and drawn in
 * the film's own 3D space using the camera exported for each frame
 * (film/export_camera.py). Each is an airliner sprite rendered in Blender
 * under the same light (film/sprites.py), chosen by the angle it is seen at.
 */

type Vec = [number, number, number];
export interface Pose {
  p: Vec;
  r: Vec;
  u: Vec;
  f: Vec;
}
export interface CameraData {
  fov: number;
  aspect: number;
  frames: Pose[];
  open: Pose;
  city: Pose;
}
/** Where the film frame was drawn on the canvas, in canvas pixels. */
export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SPRITE_METRES = 80.5; // the width a sprite image spans (see film/sprites.py)
const HEADINGS = 16;

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec, b: Vec, k = 1): Vec => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec): Vec => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

interface Flight {
  start: Vec;
  dir: Vec;
  speed: number;
  born: number;
  life: number;
  phase: number;
}

export class AirTraffic {
  private camera: CameraData | null = null;
  private sprites: Record<string, HTMLImageElement> = {};
  private kind = '';
  private flights: Flight[] = [];
  private nextSpawn = 0;
  private random = Math.random;

  constructor() {
    fetch('/film/camera.json')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: CameraData | null) => {
        this.camera = data;
      })
      .catch(() => undefined);
  }

  setKind(kind: string) {
    if (kind === this.kind) return;
    this.kind = kind;
    this.sprites = {};
    for (const elev of ['below', 'above']) {
      for (let k = 0; k < HEADINGS; k++) {
        const image = new Image();
        image.decoding = 'async';
        image.src = `/film/aircraft/${kind}-${elev}-${String(k).padStart(2, '0')}.webp`;
        this.sprites[`${elev}-${k}`] = image;
      }
    }
  }

  get ready() {
    return !!this.camera;
  }

  pose(index: number | 'open' | 'city'): Pose | null {
    if (!this.camera) return null;
    if (index === 'open') return this.camera.open;
    if (index === 'city') return this.camera.city;
    return this.camera.frames[Math.max(0, Math.min(this.camera.frames.length - 1, index))] ?? null;
  }

  /**
   * A new flight that crosses the view: a random point in the visible sky, a
   * random distance (mostly 1-6 km, sometimes close, sometimes far out), any
   * heading. Every visit and every flight is different.
   */
  private spawn(now: number, pose: Pose) {
    const r = this.random;
    const camera = this.camera as CameraData;
    const tanX = Math.tan(camera.fov / 2);
    const tanY = tanX / camera.aspect;
    const sx = (r() * 2 - 1) * 0.85;
    const sy = -0.05 + r() * 0.8;
    const distance = r() < 0.15 ? 500 + r() * 900 : r() < 0.8 ? 1400 + r() * 4800 : 6000 + r() * 12000;
    const ray = norm(add(add(pose.f, pose.r, sx * tanX), pose.u, sy * tanY));
    const centre = add(pose.p, ray, distance);
    // Keep it above the fog and the hills.
    centre[2] = Math.max(centre[2], 320 + r() * 200);
    const heading = r() * Math.PI * 2;
    const climb = (r() - 0.6) * 0.05; // most are descending toward the airport
    const dir = norm([Math.cos(heading), Math.sin(heading), climb]);
    const speed = 70 + r() * 35;
    const life = 16 + r() * 26;
    // It reaches that point about a third to two thirds of the way through its flight.
    const start = add(centre, dir, -speed * life * (0.35 + r() * 0.3));
    this.flights.push({ start, dir, speed, born: now, life, phase: r() });
  }

  /** Draw every flight for this frame. alpha fades the whole layer (in and under the fog). */
  draw(ctx: CanvasRenderingContext2D, pose: Pose | null, rect: FrameRect, now: number, alpha: number) {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    const camera = this.camera;
    if (!camera || !pose || alpha <= 0.01) return;

    this.flights = this.flights.filter((flight) => now - flight.born < flight.life);
    if (now > this.nextSpawn && this.flights.length < 3) {
      this.spawn(now, pose);
      this.nextSpawn = now + 3 + this.random() * 9;
    }

    const tanX = Math.tan(camera.fov / 2);
    const tanY = tanX / camera.aspect;
    const project = (point: Vec) => {
      const v = sub(point, pose.p);
      const z = dot(v, pose.f);
      if (z <= 1) return null;
      const sx = dot(v, pose.r) / (z * tanX);
      const sy = dot(v, pose.u) / (z * tanY);
      return { x: rect.x + (sx * 0.5 + 0.5) * rect.w, y: rect.y + (0.5 - sy * 0.5) * rect.h, z };
    };
    const night = this.kind === 'night';
    const day = this.kind === 'day';

    for (const flight of this.flights) {
      const age = now - flight.born;
      const at = add(flight.start, flight.dir, flight.speed * age);
      const screen = project(at);
      if (!screen) continue;
      // Fade in and out at the ends of the flight, and with distance (haze).
      const edge = Math.min(1, age / 2.5, (flight.life - age) / 2.5);
      const haze = Math.exp(-screen.z / (day ? 26000 : 34000));
      const a = alpha * edge * haze;
      if (a < 0.02) continue;
      const px = (SPRITE_METRES / (screen.z * tanX * 2)) * rect.w;

      // The angle the aircraft is seen at, for the sprite.
      const view = norm([at[0] - pose.p[0], at[1] - pose.p[1], 0]);
      const viewRight: Vec = [view[1], -view[0], 0];
      const yaw = Math.atan2(dot(flight.dir, viewRight), dot(flight.dir, view));
      const k = (Math.round((yaw / (Math.PI * 2)) * HEADINGS) + HEADINGS) % HEADINGS;
      const elev = pose.p[2] > at[2] ? 'above' : 'below';
      const sprite = this.sprites[`${elev}-${k}`];
      if (px >= 6 && sprite?.complete && sprite.naturalWidth) {
        ctx.globalAlpha = a * (night ? 0.75 : 1);
        ctx.drawImage(sprite, screen.x - px / 2, screen.y - px / 2, px, px);
      } else if (!night) {
        // Too far for detail: a speck of fuselage catching the light.
        ctx.globalAlpha = a * 0.8;
        ctx.fillStyle = day ? 'rgba(235,238,245,1)' : 'rgba(250,215,190,1)';
        ctx.fillRect(screen.x - 1, screen.y - 0.5, 2, 1);
      }

      // Lights: red on the left wingtip, green on the right, a white strobe,
      // and a landing light when heading toward the viewer.
      const side = norm([flight.dir[1], -flight.dir[0], 0]);
      const lights: [Vec, string, number][] = [
        [add(at, side, -30), '255,40,30', 1],
        [add(at, side, 30), '40,255,110', 1],
      ];
      const lightScale = night ? 1 : day ? 0.35 : 0.7;
      for (const [point, colour, strength] of lights) {
        const s = project(point);
        if (!s) continue;
        glow(ctx, s.x, s.y, Math.max(0.8, px * 0.015), `rgba(${colour},1)`, a * strength * lightScale);
      }
      const flash = ((now + flight.phase) % 1.2) < 0.08 ? 1 : 0;
      if (flash) glow(ctx, screen.x, screen.y - px * 0.04, Math.max(1.6, px * 0.04), 'rgba(255,255,255,1)', a * lightScale * 1.4);
      const toward = -Math.cos(yaw);
      if (toward > 0.3) glow(ctx, screen.x, screen.y + px * 0.02, Math.max(1.5, px * 0.05), 'rgba(255,245,225,1)', a * toward * (night ? 1 : 0.4));
    }
    ctx.globalAlpha = 1;
  }
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, alpha: number) {
  if (alpha <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
  g.addColorStop(0, colour);
  g.addColorStop(0.25, colour.replace(',1)', ',0.45)'));
  g.addColorStop(1, colour.replace(',1)', ',0)'));
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
}
