import { describe, expect, it } from "vitest";
import { missedCallEstimate } from "./MissedCallCalculator";
import { QUESTIONS, readiness } from "./AiReadiness";

describe("missed-call calculator", () => {
  it("multiplies the visitor's own inputs", () => {
    const r = missedCallEstimate({ callsPerWeek: 40, missedPct: 20, bookPct: 30, jobValue: 400 });
    expect(r.yearly).toBeCloseTo(40 * 0.2 * 0.3 * 400 * 52);
    expect(r.monthly).toBeCloseTo(r.yearly / 12);
  });
  it("treats blank or negative inputs as zero and caps percentages", () => {
    expect(missedCallEstimate({ callsPerWeek: NaN, missedPct: 20, bookPct: 30, jobValue: 400 }).yearly).toBe(0);
    expect(missedCallEstimate({ callsPerWeek: 10, missedPct: 250, bookPct: 100, jobValue: 1 }).yearly).toBe(520);
  });
});

describe("AI readiness", () => {
  it("scores out of 100 and suggests the three weakest areas", () => {
    const all = Object.fromEntries(QUESTIONS.map((q) => [q.id, 3]));
    expect(readiness(all).score).toBe(100);
    const r = readiness({ ...all, invoicing: 0, data: 1, reviews: 0 });
    expect(r.steps).toEqual([QUESTIONS[3].step, QUESTIONS[7].step, QUESTIONS[4].step]);
    expect(readiness({}).score).toBe(0);
  });
});
