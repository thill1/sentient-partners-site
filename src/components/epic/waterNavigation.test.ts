import { describe, expect, it } from 'vitest';
import { routeOnWater, type WaterGrid } from './waterNavigation';
import { trafficDisplacement, type TrafficMotion } from './trafficPhysics';

describe('vessel navigation', () => {
  const motion: TrafficMotion = { heading: 0, speed: 1, turnRate: .05, bobAmplitude: 0, bobPeriod: 0, bobPhase: 0 };
  const water: WaterGrid = { x: -100, y: -100, step: 5, width: 41, height: 41, cells: new Array(41 * 41).fill(1) };

  it('validates the full continuous loop instead of only a short initial segment', () => {
    expect(routeOnWater(water, [0, -20, 0], motion, 12, 3)).toBe(true);
    const period = 2 * Math.PI / motion.turnRate;
    const displacement = trafficDisplacement(motion, period);
    expect(Math.hypot(displacement[0], displacement[1])).toBeLessThan(1e-10);
    const next = trafficDisplacement(motion, period + .1);
    expect(Math.hypot(next[0], next[1])).toBeCloseTo(.1, 5);
  });

  it('rejects a hull whose bow reaches land even when the entire centre path is on water', () => {
    const coastal = { ...water, cells: water.cells.map((_value, index) => index % water.width >= 25 ? 0 : 1) };
    expect(routeOnWater(coastal, [0, -20, 0], motion, 1, 1)).toBe(true);
    expect(routeOnWater(coastal, [0, -20, 0], motion, 40, 6)).toBe(false);
  });
});
