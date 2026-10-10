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
  /** Horizontal half-angle tangent for this frame, when the lens is animated (phone film). */
  tx?: number;
}
/** The lens of a pose: its own (phone film) or the film's single lens. */
export const poseTan = (camera: { fov: number }, pose: { tx?: number } | null | undefined): number => pose?.tx ?? Math.tan(camera.fov / 2);

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

type AircraftType = 'airliner' | 'cessna' | 'helicopter';

/**
 * How each type flies: distance from the camera, cruise speed (m/s), the
 * lowest it may be (m), climb rate range and how hard it may turn. A mix of
 * airliners on approach, Cessna-class light aircraft and helicopters.
 */
const TYPES: Record<AircraftType, { share: number; near: number; far: number; speed: [number, number]; floor: number; ceiling: number; climb: number; turn: number }> = {
  airliner: { share: 0.5, near: 1400, far: 8900, speed: [70, 105], floor: 350, ceiling: 4000, climb: 0.035, turn: 0.002 },
  cessna: { share: 0.3, near: 350, far: 1600, speed: [48, 62], floor: 250, ceiling: 900, climb: 0.02, turn: 0.004 },
  helicopter: { share: 0.2, near: 300, far: 1400, speed: [28, 45], floor: 120, ceiling: 450, climb: 0, turn: 0.004 },
};
const ROTOR_SPIN = 32; // rad/s, close to a real main rotor; reads as motion, not a frozen cross

interface Flight extends FlightMotion {
  type: AircraftType;
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
  /** Review only: ?aircraft=cessna|helicopter|airliner makes every flight that type. */
  private forced: AircraftType | null = null;
  private spritesDrawn = true;
  private review = new URLSearchParams(window.location.search).has('review');

  constructor(directCanvas?: HTMLCanvasElement, cameraUrl = '/film/camera.json') {
    const forced = new URLSearchParams(window.location.search).get('aircraft');
    if (forced && forced in TYPES) this.forced = forced as AircraftType;
    if (!new URLSearchParams(window.location.search).has('aircraftSprites')) this.renderer = new AircraftRenderer('/film/aircraft/airliner.json', directCanvas);
    fetch(cameraUrl)
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

  /** The film camera's field of view and aspect, for layers drawn in its space. */
  get lens(): { fov: number; aspect: number } | null {
    return this.camera ? { fov: this.camera.fov, aspect: this.camera.aspect } : null;
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
    const tanX = poseTan(camera, pose);
    const tanY = tanX / camera.aspect;
    // Reject routes that converge on another aircraft. This is checked over
    // the shared lifetime, not just at spawn, so two foreground silhouettes
    // cannot appear to collide or merge into a ghost double.
    for (let attempt = 0; attempt < 16; attempt++) {
      // Enter from beyond a side edge and leave beyond an edge. The previous
      // arbitrary life timer faded aircraft out while they were still in view.
      const pick = r();
      // Keep at least one light aircraft or helicopter in the sky.
      const lightAircraftUp = this.flights.some((f) => f.type !== 'airliner');
      const type: AircraftType = this.forced ?? (!lightAircraftUp ? (r() < .6 ? 'cessna' : 'helicopter') : pick < TYPES.airliner.share ? 'airliner' : pick < TYPES.airliner.share + TYPES.cessna.share ? 'cessna' : 'helicopter');
      const t = TYPES[type];
      const side = r() < .5 ? -1 : 1;
      const sx = side * 1.3;
      const sy = (type === 'airliner' ? .05 : -.25) + r() * .65;
      const distance = t.near + r() * (t.far - t.near);
      const start = add(add(add(pose.p, pose.f, distance), pose.r, sx * tanX * distance), pose.u, sy * tanY * distance);
      start[2] = Math.min(t.ceiling, Math.max(start[2], t.floor));
      const crossingHeading = Math.atan2(pose.r[1], pose.r[0]) + (side > 0 ? Math.PI : 0);
      // Any direction across the view: mostly crossing, often diagonal, some
      // heading away into the distance or coming toward the camera.
      const spread = r() < .25 ? (r() < .5 ? -1 : 1) * (1.0 + r() * .45) : (r() - .5) * 1.4;
      const heading = crossingHeading + spread;
      const climb = (r() - .45) * t.climb;
      const speed = t.speed[0] + r() * (t.speed[1] - t.speed[0]);
      const life = (distance * tanX * 3.8) / speed + 15;
      const turnRate = (r() < .5 ? -1 : 1) * (t.turn / 2 + r() * t.turn / 2);
      const motion = { heading, turnRate, climb, speed };
      const end = add(start, flightDisplacement(motion, life));
      const relative = sub(end, pose.p);
      const depth = dot(relative, pose.f);
      if (depth < Math.min(600, t.near * .6) || end[2] < t.floor * .8) continue;
      const endX = dot(relative, pose.r) / (depth * tanX);
      const endY = dot(relative, pose.u) / (depth * tanY);
      if (Math.abs(endX) < 1.5 && Math.abs(endY) < 1.5) continue;
      const candidate: Flight = { type, start, ...motion, born: now, life, phase: r() };
      if (this.flights.every((other) => routesStaySeparated(candidate, other, now, 650))) {
        this.flights.push(candidate);
        return;
      }
    }
  }

  /** Draw every flight for this frame. alpha fades the whole layer (in and under the fog). */
  draw(ctx: CanvasRenderingContext2D, pose: Pose | null, rect: FrameRect, now: number, alpha: number, fogVisibility?: (point: Vec) => number) {
    // The 2D canvas only carries the sprite fallback; clearing a blank
    // full-screen canvas every frame was wasted GPU work.
    if (this.spritesDrawn) { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); this.spritesDrawn = false; }
    const camera = this.camera;
    if (!camera || !pose || alpha <= 0.01) { this.renderer?.clear(); return; }

    this.flights = this.flights.filter(flight => {
      const age = now - flight.born;
      if (age < flight.life) return true;
      const relative = sub(add(flight.start, flightDisplacement(flight, age)), pose.p);
      const depth = dot(relative, pose.f);
      const tan = poseTan(camera, pose);
      const stillInView = depth > 80 && Math.abs(dot(relative, pose.r) / (depth * tan)) < 1.6 && Math.abs(dot(relative, pose.u) / (depth * tan / camera.aspect)) < 1.6;
      // A camera move can reveal a route after its original exit time. Keep
      // flying until it leaves this view rather than dissolving in mid-air.
      if (stillInView) flight.life = age + 15;
      return stillInView;
    });
    if (now > this.nextSpawn && this.flights.length < 5) {
      this.spawn(now, pose);
      this.nextSpawn = now + 2 + this.random() * 5;
    }

    const tanX = poseTan(camera, pose);
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
        const opacity = alpha * edge * haze * nearCamera * (fogVisibility ? fogVisibility(position) : 1);
        if (opacity < .02) return [];
        const body: AircraftInstance = { model: flight.type, position, motion: flight, age, alpha: opacity, flash: ((now + flight.phase) % 1.2) < .08 };
        if (flight.type !== 'helicopter') return [body];
        // The main rotor spins about the mast as its own instance, a little
        // transparent so the blades read as a blur rather than a fixed cross.
        const rotor: AircraftInstance = { model: 'helirotor', position, motion: { heading: flight.heading, turnRate: ROTOR_SPIN, climb: 0, speed: 0 }, age, alpha: opacity * .55, flash: false };
        return [body, rotor];
      });
      // Review only: with ?aircraft= set, expose where each aircraft is drawn.
      if (this.forced || this.review) (window as unknown as { __aircraft?: unknown }).__aircraft = this.flights.map((flight) => {
        const screen = project(add(flight.start, flightDisplacement(flight, now - flight.born)));
        return screen && { type: flight.type, x: screen.x / (window.devicePixelRatio || 1), y: screen.y / (window.devicePixelRatio || 1), z: screen.z };
      });
      if (this.renderer.draw(ctx, camera, pose, rect, instances, this.kind)) {
        if (ctx.canvas.dataset.aircraft !== '3d') ctx.canvas.dataset.aircraft = '3d';
        return;
      }
    }
    if (ctx.canvas.dataset.aircraft !== 'sprites') ctx.canvas.dataset.aircraft = 'sprites';
    this.spritesDrawn = true;
    const night = this.kind === 'night';
    const day = this.kind === 'day';

    for (const flight of this.flights) {
      // The sprite atlas is airliner-only; other types need the 3D renderer.
      if (flight.type !== 'airliner') continue;
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
