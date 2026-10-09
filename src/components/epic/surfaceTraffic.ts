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
const BOATS = [
  { type: 'pilot', start: [3300, -250, 0] as Vec, rotation: 1.471, speed: 7.2, turn: 0.00025, length: 19 },
  { type: 'ship', start: [1350, 420, 0] as Vec, rotation: -1.69, speed: 4.8, turn: -0.00012, length: 300 },
  { type: 'ferry', start: [2050, -650, 0] as Vec, rotation: -0.423, speed: 8.4, turn: 0.00035, length: 42 },
  { type: 'ferry', start: [5650, -2050, 0] as Vec, rotation: 0.585, speed: 8.1, turn: -0.0003, length: 42 },
  { type: 'sail', start: [450, -330, 0] as Vec, rotation: -0.197, speed: 2.6, turn: 0.0003, length: 10 },
  { type: 'sail', start: [900, -520, 0] as Vec, rotation: -1.19, speed: 2.2, turn: -0.00025, length: 12 },
  { type: 'sail', start: [1250, 120, 0] as Vec, rotation: 0.54, speed: 2.4, turn: 0.00022, length: 11 },
  { type: 'sail', start: [1700, -620, 0] as Vec, rotation: -1.79, speed: 2.7, turn: -0.0002, length: 12 },
] as const;

const add = (a: Vec, b: TrafficVector): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
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
  private renderer = new AircraftRenderer('/film/traffic/models.json');
  private vessels: Vessel[] = [];
  private water: WaterGrid | null = null;
  private static readonly sailStarts = [
    [2650, -560, 0], [3050, 60, 0], [3700, -700, 0], [4250, -1150, 0],
    [4900, -1900, 0], [5100, -2050, 0], [5700, -2550, 0],
  ] as Vec[];

  constructor() {
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

  draw(ctx: CanvasRenderingContext2D, pose: Pose | null, rect: FrameRect, seconds: number, alpha: number) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const camera = this.camera;
    if (!camera || !pose || alpha <= 0.01 || !this.renderer.ready) return;
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
      return { x: rect.x + (nx * 0.5 + 0.5) * rect.w, y: rect.y + (0.5 - ny * 0.5) * rect.h, depth };
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
        const type = VEHICLES[(slot * 7 + laneIndex * 3) % VEHICLES.length];
        const size = (type.length / (screen.depth * tanX * 2)) * rect.w;
        if (size < 0.6) continue;
        instances.push({ model: type.type, position: point, motion: { heading, climb: 0, turnRate: 0, speed: 0 }, age: 0, alpha: alpha * haze(screen.depth), flash: false });
      }
    });

    // Wakes are drawn first so they trail naturally behind each live hull.
    const projectedVessels = this.vessels.map((vessel) => {
      const age = seconds + vessel.phase;
      const point = add(vessel.start, trafficDisplacement(vessel, age));
      const screen = project(point);
      return { vessel, age, point, screen, heading: trafficHeading(vessel, age) };
    }).filter((vessel) => vessel.screen);
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
      return [{ points, widths, alpha: alpha * haze(item.screen.depth) * (night ? .08 : .4) }];
    });
    for (const item of projectedVessels) {
      const screen = item.screen;
      if (!screen) continue;
      const size = (item.vessel.length / (screen.depth * tanX * 2)) * rect.w;
      if (size < 0.7) continue;
      const pitch = Math.sin(item.age * .8 + item.vessel.bobPhase) * (item.vessel.type === 'ship' ? .002 : .012);
      instances.push({ model: item.vessel.type, position: item.point, motion: { heading: item.heading, climb: pitch, turnRate: 0, speed: 0 }, age: 0, alpha: alpha * haze(screen.depth), flash: false });
    }
    ctx.globalAlpha = 1;
    this.renderer.draw(ctx, camera, pose, rect, instances, this.phase, wakes, seconds);
    ctx.canvas.dataset.traffic = '3d';
  }
}
