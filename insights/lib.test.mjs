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
    expect(all.filter((i) => i.type === "newsletter").map((i) => i.issue)).toEqual([4, 3, 2, 1]);
    expect(all.every((i) => i.date.length === 10 && i.summary)).toBe(true);
  });
  it("rejects files without required front matter", () => {
    expect(() => parseIssue("---\ntitle: x\n---\nbody", "x.md")).toThrow(/missing/);
  });
});

describe("insights hub types", () => {
  const fm = (lines, body = "Body text.") => `---\n${lines.join("\n")}\n---\n${body}`;
  it("defaults to newsletter and validates per type", () => {
    const n = parseIssue(fm(['title: "T"', "slug: a", "issue: 1", "date: 2026-10-01", 'summary: "S"', "status: draft"]));
    expect(n.type).toBe("newsletter");
    expect(() => parseIssue(fm(['title: "T"', "slug: a", "date: 2026-10-01", 'summary: "S"', "status: draft"]))).toThrow(/issue/);
    const a = parseIssue(fm(['title: "T"', "slug: a", "type: article", "date: 2026-10-01", 'summary: "S"', "status: draft"]));
    expect(a.type).toBe("article");
  });
  it("social posts need an https external_url and derive title/summary from the text", () => {
    expect(() => parseIssue(fm(["slug: s", "type: linkedin", "date: 2026-10-01", "status: draft"]))).toThrow(/external_url/);
    const s = parseIssue(fm(["slug: s", "type: x", "date: 2026-10-01", "status: draft", 'external_url: "https://x.com/p/1"'], "Hello world.\n\nMore."));
    expect(s.title).toBe("Hello world.");
    expect(s.summary).toBe("Hello world.");
    expect(() => parseIssue(fm(["slug: s", "type: tiktok", "date: 2026-10-01", "status: draft"]))).toThrow(/unknown type/);
  });
  it("samples never reach production, even if approved", () => {
    const items = [
      { slug: "sample-x", sample: true, status: "approved", date: "2026-10-02" },
      { slug: "real", sample: false, status: "approved", date: "2026-10-01" },
    ];
    expect(selectIssues(items).map((i) => i.slug)).toEqual(["real"]);
    expect(selectIssues(items, true)).toHaveLength(2);
  });
  it("the repo's sample fixtures are drafts, flagged sample, and preview-only", () => {
    const prod = loadIssues("content/insights", false);
    const prev = loadIssues("content/insights", true);
    expect(prod.some((i) => i.sample)).toBe(false);
    const samples = prev.filter((i) => i.sample);
    expect(samples.map((i) => i.type).sort()).toEqual(["article", "linkedin"]);
    expect(samples.every((i) => i.status === "draft")).toBe(true);
  });
});
