import { describe, expect, it } from "vitest";
import { pacificClock, sceneAt, sceneOverride, solarEvents } from "./sceneTime";

const pacific = (iso: string) => new Date(iso);
const clockOf = (time: number) => pacificClock(new Date(time));

describe("solarEvents", () => {
  it.each([
    // Published San Francisco times, to within a few minutes.
    ["2026-06-21T12:00:00-07:00", "5:48", "8:35"],
    ["2026-10-09T12:00:00-07:00", "7:13", "6:42"],
    ["2026-12-21T12:00:00-08:00", "7:21", "4:54"],
  ])("matches published times on %s", (iso, rise, set) => {
    const { sunrise, sunset } = solarEvents(pacific(iso));
    const minutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const actual = (t: number) => {
      const c = clockOf(t);
      return (c.hour || 12) * 60 + c.minute;
    };
    expect(Math.abs(actual(sunrise) - minutes(rise))).toBeLessThan(5);
    expect(Math.abs(actual(sunset) - minutes(set))).toBeLessThan(5);
  });

  it("uses the Pacific calendar day in the evening, after midnight UTC", () => {
    const evening = solarEvents(pacific("2026-10-09T18:00:00-07:00"));
    const noon = solarEvents(pacific("2026-10-09T12:00:00-07:00"));
    expect(evening.sunset).toBe(noon.sunset);
  });
});

describe("sceneAt", () => {
  it.each([
    ["2026-10-09T03:00:00-07:00", "night"],
    ["2026-10-09T07:20:00-07:00", "sunrise"],
    ["2026-10-09T12:00:00-07:00", "day"],
    ["2026-10-09T18:30:00-07:00", "sunset"],
    ["2026-10-09T21:00:00-07:00", "night"],
  ])("at %s is %s", (iso, scene) => {
    expect(sceneAt(pacific(iso))).toBe(scene);
  });
});

describe("pacificClock", () => {
  it("reports twelve-hour time with the zone abbreviation", () => {
    expect(pacificClock(pacific("2026-10-09T21:05:09-07:00"))).toMatchObject({
      hour: 9,
      minute: 5,
      second: 9,
      time: "9:05",
      meridiem: "PM",
      zone: "PDT",
    });
    expect(pacificClock(pacific("2026-01-09T00:30:00-08:00"))).toMatchObject({
      time: "12:30",
      meridiem: "AM",
      zone: "PST",
    });
  });
});

describe("sceneOverride", () => {
  it("accepts only known scenes", () => {
    expect(sceneOverride("?scene=night")).toBe("night");
    expect(sceneOverride("?scene=noon")).toBeNull();
    expect(sceneOverride("")).toBeNull();
  });
});
