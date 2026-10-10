import { describe, expect, it } from "vitest";
import { clearOfTowers, flightAt, nextGap, planFlight } from "./airModel";

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

describe("distant aircraft", () => {
  it("never routes over or behind a tower or its beacons", () => {
    const rand = seeded(7);
    let planned = 0,
      violations = 0;
    for (let i = 0; i < 2000; i++) {
      const flight = planFlight(rand, 0);
      if (!flight) continue;
      planned++;
      for (let t = 0; t <= flight.life; t += 0.25) {
        const { x, y } = flightAt(flight, t);
        if (!clearOfTowers(x, y, 20) || y >= 300) violations++;
      }
    }
    expect(violations).toBe(0);
    expect(planned).toBeGreaterThan(1800);
  });

  it("leaves the sky empty for long spells now and then", () => {
    const rand = seeded(11);
    const gaps = Array.from({ length: 500 }, () => nextGap(rand));
    expect(gaps.filter((g) => g >= 45).length).toBeGreaterThan(100);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(8);
  });

  it("emerges from and recedes into the haze instead of popping", () => {
    const flight = planFlight(seeded(3), 0)!;
    expect(flightAt(flight, 0).alpha).toBe(0);
    expect(flightAt(flight, flight.life).alpha).toBe(0);
    expect(flightAt(flight, flight.life / 2).alpha).toBe(1);
  });

  it("retains a legible aircraft profile throughout each route", () => {
    const rand = seeded(42);
    for (let i = 0; i < 300; i++) {
      const flight = planFlight(rand, 0);
      if (!flight) continue;
      for (const time of [0, flight.life / 2, flight.life]) {
        const { span } = flightAt(flight, time);
        expect(span).toBeGreaterThanOrEqual(8);
        expect(span).toBeLessThan(20);
      }
    }
  });

  it("keeps to the sky that is on screen and clear of the navigation", () => {
    const rand = seeded(5);
    const view = { left: 780, right: 1250, top: 140 };
    let planned = 0,
      outside = 0;
    for (let i = 0; i < 500; i++) {
      const flight = planFlight(rand, 0, view);
      if (!flight) continue;
      planned++;
      for (let t = 0; t <= flight.life; t += 0.5) {
        const { x, y } = flightAt(flight, t);
        if (y < view.top || x < view.left - 40 || x > view.right + 40)
          outside++;
      }
    }
    expect(planned).toBeGreaterThan(400);
    expect(outside).toBe(0);
  });
});
