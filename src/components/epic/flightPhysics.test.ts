import { describe, expect, it } from 'vitest';
import { flightBank, flightBasis, flightDirection, flightDisplacement, nearestSprite, routesStaySeparated, spritePitchRotation, type FlightMotion } from './flightPhysics';

describe('flight physics', () => {
  const flight: FlightMotion = { heading: 0.7, turnRate: 0.01, climb: -0.02, speed: 92 };

  it('starts with no displacement and advances at a steady airspeed', () => {
    expect(flightDisplacement(flight, 0)).toEqual([0, 0, 0]);
    const a = flightDisplacement(flight, 12);
    const b = flightDisplacement(flight, 12.1);
    const distance = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    expect(distance).toBeCloseTo(flight.speed * 0.1 * Math.sqrt(1 + flight.climb ** 2), 2);
  });

  it('changes heading continuously at the requested turn rate', () => {
    const a = flightDirection(flight, 8);
    const b = flightDirection(flight, 8.1);
    const angle = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    expect(angle).toBeCloseTo(Math.abs(flight.turnRate) * 0.1, 4);
  });

  it('keeps the 3D nose aligned with actual travel through climbing and descending turns', () => {
    for (const climb of [-.12, 0, .12]) {
      for (const turnRate of [-.014, .014]) {
        const motion = { ...flight, climb, turnRate };
        for (let age = 0; age < 80; age += .25) {
          const basis = flightBasis(motion, age);
          const a = flightDisplacement(motion, age), b = flightDisplacement(motion, age + .001);
          const step = b.map((value, i) => value - a[i]);
          const alignment = basis.forward.reduce((sum, value, i) => sum + value * step[i], 0) / Math.hypot(...step);
          expect(alignment).toBeGreaterThan(.999999);
          expect(basis.forward[2] * climb).toBeGreaterThanOrEqual(0);
          expect(Math.hypot(...basis.right)).toBeCloseTo(1, 8);
          expect(Math.hypot(...basis.up)).toBeCloseTo(1, 8);
          expect(basis.right.reduce((sum, value, i) => sum + value * basis.forward[i], 0)).toBeCloseTo(0, 8);
          expect(basis.up.reduce((sum, value, i) => sum + value * basis.forward[i], 0)).toBeCloseTo(0, 8);
        }
      }
    }
  });

  it('keeps the bank shallow at the traffic speeds used by the scene', () => {
    for (const speed of [70, 90, 105]) {
      const bank = Math.abs(flightBank({ speed, turnRate: 0.014 }));
      expect(bank).toBeLessThan((9 * Math.PI) / 180);
      expect(bank).toBeGreaterThan(0);
    }
    expect(flightBank({ speed: 90, turnRate: 0.01 })).toBeLessThan(0);
    expect(flightBank({ speed: 90, turnRate: -0.01 })).toBeGreaterThan(0);
  });

  it('adds climb and descent pitch without rotating the aircraft toward a camera-facing screen path', () => {
    const step = (Math.PI * 2) / 16;
    for (const climb of [-0.12, 0, 0.12]) {
      for (const elevation of [-10, 12]) {
        for (let index = 0; index < 16; index++) {
          const azimuth = index * step;
          const pitch = Math.atan(climb);
          const angle = elevation * Math.PI / 180;
          const rotation = spritePitchRotation(pitch, azimuth, angle);
          const forward: [number, number, number] = [0, Math.cos(pitch), Math.sin(pitch)];
          const right: [number, number, number] = [Math.cos(azimuth), Math.sin(azimuth), 0];
          const up: [number, number, number] = [-Math.sin(azimuth) * Math.sin(angle), Math.cos(azimuth) * Math.sin(angle), Math.cos(angle)];
          const expected = Math.atan2(
            -(forward[0] * up[0] + forward[1] * up[1] + forward[2] * up[2]),
            forward[0] * right[0] + forward[1] * right[1] + forward[2] * right[2],
          );
          const source = Math.atan2(-Math.cos(azimuth) * Math.sin(angle), Math.sin(azimuth));
          const actual = source + rotation;
          expect(Math.atan2(Math.sin(actual - expected), Math.cos(actual - expected))).toBeCloseTo(0, 8);
          expect(Math.abs(rotation)).toBeLessThan(Math.PI / 2);
        }
      }
    }
    expect(nearestSprite(15.99, 16)).toBe(0);
  });

  it('rejects routes that converge and allows routes with safe separation', () => {
    const eastbound = { start: [-10, 0, 0] as [number, number, number], heading: 0, turnRate: 0, climb: 0, speed: 1, born: 0, life: 20 };
    const northbound = { start: [0, -10, 0] as [number, number, number], heading: Math.PI / 2, turnRate: 0, climb: 0, speed: 1, born: 0, life: 20 };
    const verticallySeparated = { ...northbound, start: [0, -10, 100] as [number, number, number] };
    expect(routesStaySeparated(eastbound, northbound, 0, 2)).toBe(false);
    expect(routesStaySeparated(eastbound, verticallySeparated, 0, 2)).toBe(true);
    expect(routesStaySeparated(eastbound, { ...northbound, born: 30 }, 0, 2)).toBe(true);
  });
});
