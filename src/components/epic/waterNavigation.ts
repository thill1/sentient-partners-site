import { trafficDisplacement, trafficHeading, type TrafficMotion, type TrafficVector } from './trafficPhysics';

export interface WaterGrid { x: number; y: number; step: number; width: number; height: number; cells: number[] }

export function isNavigable(grid: WaterGrid, x: number, y: number): boolean {
  const ix = Math.round((x - grid.x) / grid.step), iy = Math.round((y - grid.y) / grid.step);
  return ix >= 0 && ix < grid.width && iy >= 0 && iy < grid.height && grid.cells[iy * grid.width + ix] === 1;
}

/** Validate a complete closed route and the full hull, not just its centre. */
export function routeOnWater(grid: WaterGrid, start: TrafficVector, motion: TrafficMotion, length: number, width: number): boolean {
  if (Math.abs(motion.turnRate) < 1e-5) return false;
  const duration = Math.PI * 2 / Math.abs(motion.turnRate);
  const samples = Math.max(128, Math.ceil(motion.speed * duration / (grid.step * .4)));
  for (let index = 0; index <= samples; index++) {
    const age = duration * index / samples;
    const displacement = trafficDisplacement(motion, age);
    const x = start[0] + displacement[0], y = start[1] + displacement[1];
    const heading = trafficHeading(motion, age);
    for (const along of [-length / 2, 0, length / 2]) {
      for (const across of [-width / 2, 0, width / 2]) {
        if (!isNavigable(grid, x + Math.cos(heading) * along - Math.sin(heading) * across, y + Math.sin(heading) * along + Math.cos(heading) * across)) return false;
      }
    }
  }
  return true;
}
