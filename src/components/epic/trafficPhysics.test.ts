import { describe, expect, it } from 'vitest';
import { lanePosition, laneStart, trafficDisplacement, trafficHeading, type TrafficMotion } from './trafficPhysics';

describe('independent ground and water motion', () => {
  it('moves a car continuously at constant speed along its lane', () => {
    const car: TrafficMotion = {
      heading: Math.PI / 2,
      turnRate: 0,
      speed: 22,
      bobAmplitude: 0,
      bobPeriod: 0,
      bobPhase: 0,
    };
    const before = trafficDisplacement(car, 4.9);
    const after = trafficDisplacement(car, 5.0);
    expect(after[1] - before[1]).toBeCloseTo(2.2, 8);
  });

  it('turns a vessel smoothly while keeping its speed constant', () => {
    const boat: TrafficMotion = {
      heading: 0.5,
      turnRate: 0.0015,
      speed: 8,
      bobAmplitude: 0.18,
      bobPeriod: 5.5,
      bobPhase: 0.7,
    };
    const before = trafficDisplacement(boat, 11.9);
    const after = trafficDisplacement(boat, 12);
    expect(Math.hypot(after[0] - before[0], after[1] - before[1])).toBeCloseTo(0.8, 3);
    expect(Math.abs(trafficHeading(boat, 12) - trafficHeading(boat, 11.9))).toBeCloseTo(0.00015, 8);
    expect(Math.abs(after[2])).toBeLessThanOrEqual(boat.bobAmplitude);
  });

  it('keeps lane traffic moving at a fixed scroll position and wraps beyond the bridge ends', () => {
    const start = laneStart(4, 26, -1280, 1280, 13);
    const at10 = lanePosition(start, 27, 1, 10, -1280, 1280);
    const at11 = lanePosition(start, 27, 1, 11, -1280, 1280);
    expect(at11).toBeCloseTo(at10 + 27, 8);

    const beforeEnd = lanePosition(1270, 27, 1, 0.2, -1280, 1280);
    const afterWrap = lanePosition(1270, 27, 1, 1.2, -1280, 1280);
    expect(beforeEnd).toBeGreaterThan(1270);
    expect(afterWrap).toBeCloseTo(-1257.6, 8);
  });

  it('distributes lane starts across the bridge', () => {
    const positions = Array.from({ length: 26 }, (_, slot) => laneStart(slot, 26, -1280, 1280, 0));
    expect(positions[0]).toBeCloseTo(-1280 + 2560 / 52);
    expect(positions[25]).toBeCloseTo(1280 - 2560 / 52);
  });
});
