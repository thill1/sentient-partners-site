/** Independent bridge traffic and bay vessels, projected through the film camera. */
import type { CameraData, FrameRect, Pose } from './airTraffic';
import { AircraftRenderer, type AircraftInstance, type ModelWake } from './aircraftRenderer';
import { lanePosition, laneStart, trafficDisplacement, trafficHeading, type TrafficMotion, type TrafficVector } from './trafficPhysics';
import { routeOnWater, type WaterGrid } from './waterNavigation';

type Vec = [number, number, number];
type Phase = 'day' | 'sunset' | 'night';

const LANES = [
  { x: -2.65, direction: -1 as const }, { x: -5.95, direction: -1 as const }, { x: -9.25, direction: -1 as const },
  { x: 2.65, direction: 1 as const }, { x: 5.95, direction: 1 as const }, { x: 9.25, direction: 1 as const },
];
const ROAD_MIN = -1280;
const ROAD_MAX = 1280;
const CARS_PER_LANE = 26;
const VEHICLES = [
  { type: 'sedan', length: 4.72 }, { type: 'suv', length: 4.92 },
  { type: 'truck', length: 7.22 }, { type: 'coach', length: 12.02 },
] as const;
// Body colours in roughly the mix seen on Bay Area roads (linear RGB):
// white, black, grey and silver dominate; some blue, red, green and beige.
const PAINTS: [number, number[]][] = [
  [24, [.72, .72, .7]], [20, [.02, .022, .025]], [16, [.16, .165, .17]], [15, [.42, .43, .44]],
  [10, [.03, .07, .2]], [8, [.38, .03, .025]], [4, [.04, .1, .06]], [3, [.45, .38, .26]],
];
const paintFor = (seed: number) => {
  let pick = (Math.sin(seed * 12.9898) * 43758.5453 % 1 + 1) % 1 * 100;
  for (const [share, colour] of PAINTS) { if ((pick -= share) < 0) return colour; }
  return PAINTS[0][1];
};

const BOATS = [
  { type: 'pilot', start: [3300, -250, 0] as Vec, rotation: 1.471, speed: 7.2, turn: 0.00025, length: 19 },
  { type: 'ship', start: [1350, 420, 0] as Vec, rotation: -1.69, speed: 4.8, turn: -0.00012, length: 300 },
  { type: 'ferry', start: [2050, -650, 0] as Vec, rotation: -0.423, speed: 8.4, turn: 0.00035, length: 42 },
  { type: 'ferry', start: [5650, -2050, 0] as Vec, rotation: 0.585, speed: 8.1, turn: -0.0003, length: 42 },
  { type: 'sail', start: [450, -330, 0] as Vec, rotation: -0.197, speed: 2.6, turn: 0.0003, length: 10 },
  { type: 'sail', start: [900, -520, 0] as Vec, rotation: -1.19, speed: 2.2, turn: -0.00025, length: 12 },
  { type: 'sail', start: [1250, 120, 0] as Vec, rotation: 0.54, speed: 2.4, turn: 0.00022, length: 11 },
  { type: 'sail', start: [1700, -620, 0] as Vec, rotation: -1.79, speed: 2.7, turn: -0.0002, length: 12 },
  // Where the camera can actually see open water: the Ferry Building runs
  // along the waterfront, the central Bay, and a ship inbound to Oakland.
  { type: 'ferry', start: [6600, -2600, 0] as Vec, rotation: 0.9, speed: 9.0, turn: 0.0002, length: 42 },
  { type: 'ferry', start: [7000, 0, 0] as Vec, rotation: -0.6, speed: 8.6, turn: -0.0002, length: 42 },
  { type: 'ship', start: [7600, -1200, 0] as Vec, rotation: 0.2, speed: 5.2, turn: 0.0001, length: 300 },
] as const;

const add = (a: Vec, b: TrafficVector): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
interface Mask { width: number; height: number; data: Uint8ClampedArray }

interface Vessel extends TrafficMotion {
  type: string;
  start: Vec;
  length: number;
  phase: number;
}

/**
 * Reuses the actual Blender vehicle meshes; orientation and motion are live.
 * Enable it against a clean-background sequence so traffic is never doubled.
 */
export class SurfaceTraffic {
  private camera: CameraData | null = null;
  private phase: Phase = 'sunset';
  private renderer: AircraftRenderer;
  private vessels: Vessel[] = [];
  private water: WaterGrid | null = null;
  // Where each shot's camera can actually see water (red) and the bridge
  // deck (green) through the fog (film/export_traffic_mask.py): one per
  // descent frame plus the held opening and city loops. The fog is the same
  // at every time of day, so the sunset masks serve all three. Until a mask
  // has loaded nothing is drawn: the layer cannot know where the fog is.
  private masks = new Map<string, Mask | 'loading'>();
  private static readonly review = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('review');
  private static readonly sailStarts = [
    [2650, -560, 0], [3050, 60, 0], [3700, -700, 0], [4250, -1150, 0],
    [4900, -1900, 0], [5100, -2050, 0], [5700, -2550, 0],
    // Around Angel Island and across the central Bay.
    [5200, 1600, 0], [4600, 1100, 0], [5900, 900, 0], [6500, 300, 0], [7300, -400, 0], [7900, 600, 0], [6200, -1300, 0],
  ] as Vec[];

  /**
   * Draw straight into `directCanvas` (WebGL). Rendering offscreen and then
   * copying the full-screen result into a 2D canvas every frame forced a GPU
   * sync point that stalled every layer (fog, boats, cars, aircraft) together.
   */
  constructor(directCanvas?: HTMLCanvasElement) {
    this.renderer = new AircraftRenderer('/film/traffic/models.json', directCanvas);
    fetch('/film/camera.json')
      .then((response) => response.ok ? response.json() as Promise<CameraData> : null)
      .then((camera) => { this.camera = camera; })
      .catch(() => undefined);
    fetch('/film/traffic/water.json')
      .then(response => response.ok ? response.json() as Promise<WaterGrid> : null)
      .then(water => { this.water = water; if (water) this.buildFleet(); })
      .catch(() => undefined);
  }

  setPhase(phase: Phase) {
    this.phase = phase;
  }

  /** The mask for a shot, loading it (and the next descent frames) on first use. */
  private mask(shot: number | 'open' | 'city') {
    const load = (key: string, url: string) => {
      if (this.masks.has(key)) return;
      this.masks.set(key, 'loading');
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return;
        context.drawImage(image, 0, 0);
        this.masks.set(key, { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data });
      };
      image.onerror = () => this.masks.delete(key);
      image.src = url;
    };
    const url = (index: number) => `/film/traffic/mask-sunset/${String(index + 1).padStart(4, '0')}.png`;
    if (typeof shot === 'number') {
      // One mask either side is enough; unpacking seven at once added a stall.
      for (let ahead = -1; ahead <= 1; ahead++) if (shot + ahead >= 0) load(`frame-${shot + ahead}`, url(shot + ahead));
    } else {
      load(shot, `/film/traffic/mask-${shot}-sunset.png`);
    }
    const mask = this.masks.get(typeof shot === 'number' ? `frame-${shot}` : shot);
    return mask && mask !== 'loading' ? mask : null;
  }

  /** How visible water (channel 0) or deck (channel 1) is at a frame position (0-1). */
  private seen(u: number, v: number, channel: 0 | 1, mask: Mask | null) {
    if (!mask || u < 0 || u > 1 || v < 0 || v > 1) return 0;
    const x = Math.min(mask.width - 1, Math.round(u * (mask.width - 1)));
    const y = Math.min(mask.height - 1, Math.round(v * (mask.height - 1)));
    return mask.data[(y * mask.width + x) * 4 + channel] / 255;
  }

  private buildFleet() {
    const water = this.water;
    if (!water) return;
    this.vessels = [];
    const hints = [...BOATS.map(boat => ({ type: boat.type as string, start: boat.start as Vec, speed: boat.speed, length: boat.length })), ...SurfaceTraffic.sailStarts.map(start => ({ type: 'sail', start, speed: 2.3, length: 10 }))];
    hints.forEach((hint, index) => {
      for (let attempt = 0; attempt < 100; attempt++) {
        const radius = hint.type === 'ship' ? 650 + Math.random() * 550 : hint.type === 'sail' ? 140 + Math.random() * 250 : 250 + Math.random() * 500;
        const turnRate = (Math.random() < .5 ? -1 : 1) * hint.speed / radius;
        const heading = Math.random() * Math.PI * 2;
        const centre: Vec = [hint.start[0] + (Math.random() - .5) * 1800, hint.start[1] + (Math.random() - .5) * 1800, 0];
        const signedRadius = hint.speed / turnRate;
        const candidate: Vessel = {
          ...hint, start: [centre[0] + signedRadius * Math.sin(heading), centre[1] - signedRadius * Math.cos(heading), 0],
          heading, turnRate, bobAmplitude: hint.type === 'ship' ? .12 : hint.type === 'sail' ? .28 : .18,
          bobPeriod: hint.type === 'ship' ? 8 : 5.5, bobPhase: index * 1.71, phase: Math.random() * 90,
        };
        const width = hint.type === 'ship' ? 41 : hint.type === 'ferry' ? 12 : hint.type === 'pilot' ? 7 : 4;
        if (!routeOnWater(water, candidate.start, candidate, candidate.length, width)) continue;
        const separated = this.vessels.every(other => {
          const clearance = (candidate.length + other.length) / 2 + 20;
          for (let seconds = 0; seconds < 900; seconds += 3) {
            const a = add(candidate.start, trafficDisplacement(candidate, seconds + candidate.phase));
            const b = add(other.start, trafficDisplacement(other, seconds + other.phase));
            if (Math.hypot(a[0] - b[0], a[1] - b[1]) < clearance) return false;
          }
          return true;
        });
        if (separated) { this.vessels.push(candidate); break; }
      }
    });
  }

  get ready() { return !!this.camera && this.renderer.ready && !!this.water && this.vessels.length > 0; }

  dispose() { this.renderer.dispose(); }

  draw(ctx: CanvasRenderingContext2D, pose: Pose | null, rect: FrameRect, seconds: number, alpha: number, shot: number | 'open' | 'city') {
    const camera = this.camera;
    if (!camera || !pose || alpha <= 0.01 || !this.renderer.ready) { this.renderer.clear(); return; }
    const mask = this.mask(shot);
    if (!mask) { this.renderer.clear(); return; }
    const instances: AircraftInstance[] = [];
    const tanX = Math.tan(camera.fov / 2);
    const tanY = tanX / camera.aspect;
    const project = (point: Vec) => {
      const relative = sub(point, pose.p);
      const depth = dot(relative, pose.f);
      if (depth < 1) return null;
      const nx = dot(relative, pose.r) / (depth * tanX);
      const ny = dot(relative, pose.u) / (depth * tanY);
      if (Math.abs(nx) > 1.2 || Math.abs(ny) > 1.2) return null;
      return { x: rect.x + (nx * 0.5 + 0.5) * rect.w, y: rect.y + (0.5 - ny * 0.5) * rect.h, u: nx * 0.5 + 0.5, v: 0.5 - ny * 0.5, depth };
    };
    const night = this.phase === 'night';
    const haze = (depth: number) => Math.exp(-depth / (this.phase === 'day' ? 23000 : 31000));

    // Bridge traffic advances against elapsed time; only a clear route-end wrap occurs.
    LANES.forEach((lane, laneIndex) => {
      for (let slot = 0; slot < CARS_PER_LANE; slot++) {
        const origin = laneStart(slot, CARS_PER_LANE, ROAD_MIN, ROAD_MAX, 13);
        // One cruise speed per lane preserves headway: different per-car
        // speeds on a closed lane eventually made vehicles overlap.
        const y = lanePosition(origin, 19 + (laneIndex % 3) * .75, lane.direction, seconds + laneIndex * 0.73, ROAD_MIN, ROAD_MAX);
        const point: Vec = [lane.x, y, 67.65];
        const screen = project(point);
        if (!screen) continue;
        const heading = lane.direction === 1 ? Math.PI / 2 : -Math.PI / 2;
        // Mostly cars and SUVs, some trucks, the occasional bus (equal shares
        // made a quarter of the traffic red coaches).
        const roll = ((Math.sin((slot * 17 + laneIndex * 5 + 3) * 78.233) * 43758.5453) % 1 + 1) % 1;
        const type = VEHICLES[roll < .55 ? 0 : roll < .86 ? 1 : roll < .97 ? 2 : 3];
        const size = (type.length / (screen.depth * tanX * 2)) * rect.w;
        if (size < 0.6) continue;
        const deck = this.seen(screen.u, screen.v, 1, mask);
        if (deck < .02) continue;
        instances.push({ model: type.type, position: point, motion: { heading, climb: 0, turnRate: 0, speed: 0 }, age: 0, alpha: alpha * haze(screen.depth) * deck, flash: false, paint: type.type === 'coach' ? undefined : paintFor(slot * 31 + laneIndex * 7 + 1) });
      }
    });

    // Wakes are drawn first so they trail naturally behind each live hull.
    const projectedVessels = this.vessels.map((vessel) => {
      const age = seconds + vessel.phase;
      const point = add(vessel.start, trafficDisplacement(vessel, age));
      const screen = project(point);
      const heading = trafficHeading(vessel, age);
      // Bow, midships and stern must all be in clear air; a hull fades as
      // it sails into the bank rather than showing through the fog.
      let seen = 0;
      if (screen) {
        seen = 1;
        for (const along of [-.5, .5]) {
          const end = project([point[0] + Math.cos(heading) * vessel.length * along, point[1] + Math.sin(heading) * vessel.length * along, 0]);
          seen = Math.min(seen, end ? this.seen(end.u, end.v, 0, mask) : 0);
        }
        seen = Math.min(seen, this.seen(screen.u, screen.v, 0, mask));
      }
      return { vessel, age, point, screen, heading, seen };
    }).filter((vessel) => vessel.screen && vessel.seen > .02);
    const wakes: ModelWake[] = projectedVessels.flatMap(item => {
      if (!item.screen) return [];
      const duration = Math.min(22, item.vessel.length / item.vessel.speed * 1.7);
      const beam = item.vessel.type === 'ship' ? 40 : item.vessel.type === 'ferry' ? 11 : item.vessel.type === 'pilot' ? 6 : 3;
      const points: Vec[] = [], widths: number[] = [];
      for (let step = 0; step <= 16; step++) {
        const age = item.age - duration * step / 16;
        const point = add(item.vessel.start, trafficDisplacement(item.vessel, age));
        const heading = trafficHeading(item.vessel, age);
        point[0] -= Math.cos(heading) * item.vessel.length / 2;
        point[1] -= Math.sin(heading) * item.vessel.length / 2;
        points.push(point); widths.push(beam * .4 + step / 16 * duration * item.vessel.speed * .08);
      }
      return [{ points, widths, alpha: alpha * haze(item.screen.depth) * item.seen * (night ? .08 : .4) }];
    });
    for (const item of projectedVessels) {
      const screen = item.screen;
      if (!screen) continue;
      const size = (item.vessel.length / (screen.depth * tanX * 2)) * rect.w;
      if (size < 0.7) continue;
      const pitch = Math.sin(item.age * .8 + item.vessel.bobPhase) * (item.vessel.type === 'ship' ? .002 : .012);
      instances.push({ model: item.vessel.type, position: item.point, motion: { heading: item.heading, climb: pitch, turnRate: 0, speed: 0 }, age: 0, alpha: alpha * haze(screen.depth) * item.seen, flash: false });
    }
    ctx.globalAlpha = 1;
    // Review only: ?review exposes where each visible vessel is drawn.
    if (SurfaceTraffic.review) (window as unknown as { __vessels?: unknown }).__vessels = projectedVessels.map((item) => item.screen && {
      type: item.vessel.type, x: item.screen.x / (window.devicePixelRatio || 1), y: item.screen.y / (window.devicePixelRatio || 1), depth: item.screen.depth, seen: item.seen,
    });
    this.renderer.draw(ctx, camera, pose, rect, instances, this.phase, wakes, seconds);
    if (ctx.canvas.dataset.traffic !== '3d') ctx.canvas.dataset.traffic = '3d';
  }
}
