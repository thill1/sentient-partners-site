import { describe, expect, it } from "vitest";
import { planVessel, vesselAt } from "./boatModel";

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

describe("bay vessels", () => {
  it("travels visibly within five seconds, with slower container ships", () => {
    const random = seeded(52);
    for (let i = 0; i < 100; i++) {
      const vessel = planVessel(random, 0, i % 3, { left: 0, right: 1536 });
      const distance = Math.abs(vesselAt(vessel, 35).x - vesselAt(vessel, 30).x);
      expect(distance).toBeGreaterThanOrEqual(vessel.kind === "cargo" ? 8 : 14);
      expect(distance).toBeLessThanOrEqual(vessel.kind === "cargo" ? 11 : 20);
    }
  });
  it("keeps every route in open water and separates traffic by depth", () => {
    const random = seeded(31);
    const kinds = new Set<string>();
    for (const view of [{ left: 0, right: 1536 }, { left: 760, right: 1240 }]) {
      for (let run = 0; run < 100; run++) {
        const fleet = [0, 1, 2].map((slot) => planVessel(random, 0, slot, view));
        expect(fleet.filter((v) => v.kind === "cargo").length).toBeLessThanOrEqual(1);
        for (const vessel of fleet) {
          kinds.add(vessel.kind);
          for (let t = 0; t <= vessel.life; t += 10) {
            const { x, y } = vesselAt(vessel, t);
            expect(x).toBeGreaterThanOrEqual(Math.max(40, view.left - 60) - 1);
            expect(x).toBeLessThanOrEqual(Math.min(1490, view.right + 60) + 1);
            expect(y).toBeGreaterThan(519);
            expect(y).toBeLessThan(754);
          }
        }
        expect(fleet[1].y - fleet[0].y).toBeGreaterThan(75);
        expect(fleet[2].y - fleet[1].y).toBeGreaterThan(75);
      }
    }
    expect([...kinds].sort()).toEqual(["cargo", "sloop", "yacht"]);
  });

  it("fades at route ends and remains invisible during the quiet interval", () => {
    const vessel = planVessel(seeded(3), 30, 0, { left: 0, right: 1536 });
    expect(vesselAt(vessel, 0).alpha).toBe(0);
    expect(vesselAt(vessel, 30).alpha).toBe(0);
    expect(vesselAt(vessel, 39).alpha).toBeCloseTo(0.5);
    expect(vesselAt(vessel, 30 + vessel.life / 2).alpha).toBe(1);
    expect(vesselAt(vessel, 30 + vessel.life).alpha).toBe(0);
  });

  it("uses the water below the deck and left of the near pier on phones", () => {
    const random = seeded(25);
    for (let i = 0; i < 100; i++) {
      for (const slot of [0, 1]) {
        const vessel = planVessel(random, 0, slot, { left: 755, right: 1250, compact: true });
        for (const t of [0, vessel.life / 2, vessel.life]) {
          const { x, y } = vesselAt(vessel, t);
          expect(x).toBeGreaterThanOrEqual(694);
          expect(x).toBeLessThanOrEqual(991);
          expect(y).toBeGreaterThan(739);
          expect(y).toBeLessThan(870);
        }
      }
    }
  });
});
