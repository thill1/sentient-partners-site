import { describe, expect, it } from "vitest";
import {
  laneFlow,
  newVehicle,
  ROAD_LENGTH,
  roadPoint,
  SPEED_LIMIT,
  stepLane,
  trafficProfile,
  type Lane,
} from "./trafficModel";

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const run = (date: string, direction: 1 | -1 = 1, seconds = 600) => {
  const profile = trafficProfile(new Date(date));
  const lane: Lane = { direction, cars: [], arrival: 0 };
  const rand = seeded(7);
  for (let t = 0; t < seconds; t += 0.1) stepLane(lane, 0.1, profile, rand);
  return lane;
};

describe("Pacific-time illustrative traffic", () => {
  it("is busier at weekday rush hour than midday, and busier at midday than night", () => {
    const rush = trafficProfile(new Date("2026-10-09T15:00:00Z")); // Fri 08:00 PDT
    const day = trafficProfile(new Date("2026-10-09T20:00:00Z")); // 13:00
    const night = trafficProfile(new Date("2026-10-09T10:00:00Z")); // 03:00
    expect(rush.period).toBe("rush");
    expect(night.period).toBe("night");
    expect(rush.level).toBeGreaterThan(day.level);
    expect(day.level).toBeGreaterThan(night.level);
  });
  it("leans toward the city in the morning and toward Marin in the evening", () => {
    const morning = trafficProfile(new Date("2026-10-09T15:00:00Z"));
    const evening = trafficProfile(new Date("2026-10-10T00:30:00Z")); // 17:30
    expect(laneFlow(morning, -1)).toBeGreaterThan(laneFlow(morning, 1));
    expect(laneFlow(evening, 1)).toBeGreaterThan(laneFlow(evening, -1));
  });
  it("has no commute peaks at weekends and follows daylight saving time", () => {
    expect(trafficProfile(new Date("2026-10-10T15:00:00Z")).period).toBe("day");
    expect(trafficProfile(new Date("2026-12-11T16:00:00Z")).period).toBe("rush");
  });
  it("fills the deck more densely and moves it more slowly at rush hour", () => {
    const rush = run("2026-10-09T15:00:00Z", -1);
    const night = run("2026-10-09T10:00:00Z", -1);
    const mean = (lane: Lane) =>
      lane.cars.reduce((sum, car) => sum + car.v, 0) / Math.max(1, lane.cars.length);
    expect(rush.cars.length).toBeGreaterThan(night.cars.length * 4);
    const day = run("2026-10-09T20:00:00Z", -1);
    expect(mean(rush)).toBeLessThan(mean(day));
    expect(mean(day)).toBeGreaterThan(SPEED_LIMIT * 0.85);
  });
  it("keeps vehicles in order with real gaps and believable speeds", () => {
    const lane = run("2026-10-09T15:00:00Z");
    expect(lane.cars.length).toBeGreaterThan(10);
    lane.cars.forEach((car, i) => {
      expect(car.v).toBeGreaterThanOrEqual(0);
      expect(car.v).toBeLessThan(SPEED_LIMIT * 1.2);
      expect(car.s).toBeLessThanOrEqual(ROAD_LENGTH + car.length);
      if (i) expect(lane.cars[i - 1].s - lane.cars[i - 1].length - car.s).toBeGreaterThan(0.5);
    });
    const gaps = lane.cars
      .slice(1)
      .map((car, i) => lane.cars[i].s - lane.cars[i].length - car.s);
    expect(Math.max(...gaps)).toBeGreaterThan(Math.min(...gaps) * 3);
  });
  it("mixes cars, trucks and buses of different sizes", () => {
    const rand = seeded(3);
    const kinds = new Set(Array.from({ length: 400 }, () => newVehicle(rand).kind));
    expect(kinds.size).toBeGreaterThanOrEqual(7);
  });
  it("projects the road into increasing distance and scale toward the camera", () => {
    const far = roadPoint(0),
      middle = roadPoint(0.5),
      near = roadPoint(1);
    expect(far.x).toBe(490);
    expect(near.x).toBe(1400);
    expect(middle.scale).toBeGreaterThan(far.scale);
    expect(middle.scale).toBeLessThan(near.scale);
  });
});
