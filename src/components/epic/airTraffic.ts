/**
 * Live air traffic over the rendered film. Aircraft are not in the frames;
 * they are flown here on random paths, every visit different, and drawn in
 * the film's own 3D space using the camera exported for each frame
 * (film/export_camera.py). Each is an airliner sprite rendered in Blender
 * under the same light (film/sprites.py), chosen by the angle it is seen at.
 */
import { flightDirection, flightDisplacement, nearestSprite, routesStaySeparated, spritePitchRotation, type FlightMotion } from './flightPhysics';
import { AircraftRenderer, type AircraftInstance } from './aircraftRenderer';

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
type LightName = 'red' | 'green' | 'tail' | 'strobe';
interface LightAnchor { x: number; y: number; visible: boolean }
interface AircraftAnchors { views: Record<string, Record<LightName, LightAnchor>> }

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec, b: Vec, k = 1): Vec => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec): Vec => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

interface Flight extends FlightMotion {
  start: Vec;
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
  private anchors: AircraftAnchors | null = null;
  private renderer: AircraftRenderer | null = null;

  constructor(directCanvas?: HTMLCanvasElement) {
    if (!new URLSearchParams(window.location.search).has('aircraftSprites')) this.renderer = new AircraftRenderer('/film/aircraft/airliner.json', directCanvas);
    fetch('/film/camera.json')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: CameraData | null) => {
        this.camera = data;
      })
      .catch(() => undefined);
    fetch('/film/aircraft/anchors.json')
      .then((response) => response.ok ? response.json() as Promise<AircraftAnchors> : null)
      .then((anchors) => { this.anchors = anchors; })
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
    // Reject routes that converge on another aircraft. This is checked over
    // the shared lifetime, not just at spawn, so two foreground silhouettes
    // cannot appear to collide or merge into a ghost double.
    for (let attempt = 0; attempt < 16; attempt++) {
      // Enter from beyond a side edge and leave beyond an edge. The previous
      // arbitrary life timer faded aircraft out while they were still in view.
      const side = r() < .5 ? -1 : 1;
      const sx = side * 1.3;
      const sy = .05 + r() * .65;
      const distance = 1400 + r() * 7500;
      const start = add(add(add(pose.p, pose.f, distance), pose.r, sx * tanX * distance), pose.u, sy * tanY * distance);
      start[2] = Math.max(start[2], 350);
      const crossingHeading = Math.atan2(pose.r[1], pose.r[0]) + (side > 0 ? Math.PI : 0);
      const heading = crossingHeading + (r() - .5) * .3;
      const climb = (r() - .45) * .035;
      const speed = 70 + r() * 35;
      const life = (distance * tanX * 3.8) / speed + 15;
      const turnRate = (r() < .5 ? -1 : 1) * (.001 + r() * .002);
      const motion = { heading, turnRate, climb, speed };
      const end = add(start, flightDisplacement(motion, life));
      const relative = sub(end, pose.p);
      const depth = dot(relative, pose.f);
      if (depth < 600 || end[2] < 280) continue;
      const endX = dot(relative, pose.r) / (depth * tanX);
      const endY = dot(relative, pose.u) / (depth * tanY);
      if (Math.abs(endX) < 1.5 && Math.abs(endY) < 1.5) continue;
      const candidate: Flight = { start, ...motion, born: now, life, phase: r() };
      if (this.flights.every((other) => routesStaySeparated(candidate, other, now, 650))) {
        this.flights.push(candidate);
        return;
      }
    }
  }

  /** Draw every flight for this frame. alpha fades the whole layer (in and under the fog). */
  draw(ctx: CanvasRenderingContext2D, pose: Pose | null, rect: FrameRect, now: number, alpha: number) {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    const camera = this.camera;
    if (!camera || !pose || alpha <= 0.01) { this.renderer?.clear(); return; }

    this.flights = this.flights.filter(flight => {
      const age = now - flight.born;
      if (age < flight.life) return true;
      const relative = sub(add(flight.start, flightDisplacement(flight, age)), pose.p);
      const depth = dot(relative, pose.f);
      const tan = Math.tan(camera.fov / 2);
      const stillInView = depth > 80 && Math.abs(dot(relative, pose.r) / (depth * tan)) < 1.6 && Math.abs(dot(relative, pose.u) / (depth * tan / camera.aspect)) < 1.6;
      // A camera move can reveal a route after its original exit time. Keep
      // flying until it leaves this view rather than dissolving in mid-air.
      if (stillInView) flight.life = age + 15;
      return stillInView;
    });
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
    if (this.renderer?.ready) {
      const instances: AircraftInstance[] = this.flights.flatMap(flight => {
        const age = now - flight.born;
        const position = add(flight.start, flightDisplacement(flight, age));
        const screen = project(position);
        if (!screen) return [];
        const edge = Math.min(1, age / 2.5);
        const haze = Math.exp(-screen.z / (this.kind === 'day' ? 26000 : 34000));
        const nearCamera = Math.max(0, Math.min(1, (screen.z - 80) / 420));
        const opacity = alpha * edge * haze * nearCamera;
        return opacity < .02 ? [] : [{ position, motion: flight, age, alpha: opacity, flash: ((now + flight.phase) % 1.2) < .08 }];
      });
      if (this.renderer.draw(ctx, camera, pose, rect, instances, this.kind)) {
        ctx.canvas.dataset.aircraft = '3d';
        return;
      }
    }
    ctx.canvas.dataset.aircraft = 'sprites';
    const night = this.kind === 'night';
    const day = this.kind === 'day';

    for (const flight of this.flights) {
      const age = now - flight.born;
      const at = add(flight.start, flightDisplacement(flight, age));
      const dir = flightDirection(flight, age);
      const screen = project(at);
      if (!screen) continue;
      // Fade in and out at the ends of the flight, and with distance (haze).
      const edge = Math.min(1, age / 2.5);
      const haze = Math.exp(-screen.z / (day ? 26000 : 34000));
      // Fade before crossing the camera plane; a route must never pop from a
      // distant aircraft into an enormous near-camera sprite and disappear.
      const nearCamera = Math.max(0, Math.min(1, (screen.z - 80) / 420));
      const a = alpha * edge * haze * nearCamera;
      if (a < 0.02) continue;
      const px = Math.min((SPRITE_METRES / (screen.z * tanX * 2)) * rect.w, rect.w * 0.2);

      // The angle the aircraft is seen at, for the sprite.
      const view = norm([at[0] - pose.p[0], at[1] - pose.p[1], 0]);
      const viewRight: Vec = [view[1], -view[0], 0];
      const yaw = Math.atan2(dot(dir, viewRight), dot(dir, view));
      const spriteAngle = ((yaw / (Math.PI * 2)) * HEADINGS + HEADINGS) % HEADINGS;
      // The atlas heading already encodes the aircraft's camera-relative yaw.
      // Only add its real climb/descent pitch; rotating toward the full
      // screen-projected path would roll the wings when it flies at the camera.
      const k = nearestSprite(spriteAngle, HEADINGS);
      const elev = pose.p[2] > at[2] ? 'above' : 'below';
      const sprite = this.sprites[`${elev}-${k}`];
      const atlasElevation = (elev === 'above' ? 12 : -10) * Math.PI / 180;
      const spriteRotation = spritePitchRotation(Math.atan(flight.climb), (k * Math.PI * 2) / HEADINGS, atlasElevation);
      const spriteAlpha = a * (night ? 0.75 : 1);
      const drawSprite = (sprite: HTMLImageElement | undefined, opacity: number) => {
        if (opacity <= 0.01 || !sprite?.complete || !sprite.naturalWidth) return false;
        ctx.save();
        ctx.globalAlpha = spriteAlpha * opacity;
        ctx.translate(screen.x, screen.y);
        ctx.rotate(spriteRotation);
        ctx.drawImage(sprite, -px / 2, -px / 2, px, px);
        ctx.restore();
        return true;
      };
      const hasSprite = !!sprite?.complete && sprite.naturalWidth > 0;
      let spriteVisible = false;
      if (px >= 6 && hasSprite) {
        spriteVisible = drawSprite(sprite, 1);
      } else if (!night) {
        // Too far for detail: a speck of fuselage catching the light.
        ctx.globalAlpha = a * 0.8;
        ctx.fillStyle = day ? 'rgba(235,238,245,1)' : 'rgba(250,215,190,1)';
        ctx.fillRect(screen.x - 1, screen.y - 0.5, 2, 1);
      }

      // Positions and occlusion come from the actual bulb meshes, exported
      // through the exact sprite camera. The wing tips are swept back 10 m;
      // assuming they lay on the fuselage origin put the lights in empty air.
      const anchors = this.anchors?.views[`${elev}-${k}`];
      const lights: [LightName, string][] = [['red', '255,40,30'], ['green', '40,255,110'], ['tail', '255,245,225']];
      const lightScale = night ? 1 : day ? 0.35 : 0.7;
      // Suppress colored points before a wing silhouette is large enough to
      // read; otherwise distant navigation lights appear detached in the sky.
      const wingDetail = Math.max(0, Math.min(1, (px - 2) / 4));
      const drawLight = (name: LightName, colour: string, intensity = 1) => {
        // Never show navigation lights detached from a loaded aircraft body.
        const anchor = anchors?.[name];
        if (!spriteVisible || wingDetail <= 0 || !anchor?.visible) return;
        const dx = anchor.x * px;
        const dy = anchor.y * px;
        const x = screen.x + dx * Math.cos(spriteRotation) - dy * Math.sin(spriteRotation);
        const y = screen.y + dx * Math.sin(spriteRotation) + dy * Math.cos(spriteRotation);
        glow(ctx, x, y, Math.max(0.5, px * 0.009), `rgba(${colour},1)`, spriteAlpha * lightScale * wingDetail * intensity);
      };
      for (const [name, colour] of lights) drawLight(name, colour);
      const flash = ((now + flight.phase) % 1.2) < 0.08 ? 1 : 0;
      if (flash) drawLight('strobe', '255,255,255', 1.4);
    }
    ctx.globalAlpha = 1;
  }

  dispose() { this.renderer?.dispose(); }
  clear() { this.renderer?.clear(); }
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
