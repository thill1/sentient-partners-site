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

import { timeBack } from "./TimeBack";
import { countScore, ratingScore, reputation, AREAS } from "./Reputation";

describe("time-back estimator", () => {
  it("applies the visitor's automation share to their own hours", () => {
    const r = timeBack({ hours: [3, 2, 2, 3], sharePct: 50, hourly: 40 });
    expect(r.weekly).toBe(5);
    expect(r.yearly).toBe(260);
    expect(r.value).toBe(10400);
    expect(timeBack({ hours: [NaN, -2, 1, 1], sharePct: 150, hourly: NaN }).weekly).toBe(2);
  });
});

describe("reputation snapshot", () => {
  it("scores what the visitor entered and suggests the weakest areas", () => {
    expect(ratingScore(4.7)).toBe(3);
    expect(ratingScore(3.2)).toBe(0);
    expect(countScore(9)).toBe(0);
    expect(countScore(200)).toBe(3);
    const r = reputation({ rating: 3, count: 3, recency: 0, replies: 1, asking: 0 });
    expect(r.score).toBe(47);
    expect(r.steps).toEqual([AREAS.recency, AREAS.asking, AREAS.replies]);
  });
});

import { existsSync } from "node:fs";
import { templates } from "../ToolsPage";

describe("free templates", () => {
  it("every download link points at a built file", () => {
    for (const t of templates) for (const f of t.files) expect(existsSync(`public${f.href}`)).toBe(true);
  });
});
