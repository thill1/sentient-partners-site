import { describe, expect, it } from "vitest";
import { includeDrafts, loadIssues, parseIssue, selectIssues } from "./lib.mjs";

const mk = (issue, date, status) => ({ issue, date, status, slug: `i${issue}` });

describe("insights publishing gate", () => {
  it("production includes approved issues only, newest first", () => {
    const out = selectIssues([mk(1, "2026-09-10", "approved"), mk(2, "2026-09-15", "draft"), mk(3, "2026-10-01", "approved")]);
    expect(out.map((i) => i.issue)).toEqual([3, 1]);
  });
  it("the draft flag adds drafts but never other statuses", () => {
    const out = selectIssues([mk(1, "2026-09-10", "draft"), mk(2, "2026-09-15", "archived")], true);
    expect(out.map((i) => i.issue)).toEqual([1]);
    expect(includeDrafts({ INSIGHTS_INCLUDE_DRAFTS: "1" })).toBe(true);
    expect(includeDrafts({})).toBe(false);
  });
  it("loads the four published issues, newest first", () => {
    expect(loadIssues("content/insights", false).map((i) => i.issue)).toEqual([4, 3, 2, 1]);
    const all = loadIssues("content/insights", true);
    expect(all.map((i) => i.issue)).toEqual([4, 3, 2, 1]);
    expect(all.every((i) => i.date.length === 10 && i.summary)).toBe(true);
  });
  it("rejects files without required front matter", () => {
    expect(() => parseIssue("---\ntitle: x\n---\nbody", "x.md")).toThrow(/missing/);
  });
});
