/* global process */
// Insights content loader and publishing gate (shared by the build and Vite).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { load as yamlLoad, JSON_SCHEMA } from "js-yaml";

export const SITE = "https://sentientpartners.ai";
export const BOOKING_URL =
  "https://cal.com/sentient-partners-strategy/introductory-call";

export const includeDrafts = (env = process.env) =>
  env.INSIGHTS_INCLUDE_DRAFTS === "1";

export function parseIssue(raw, file = "") {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`Missing front matter: ${file}`);
  const meta = yamlLoad(m[1], { schema: JSON_SCHEMA }) || {};
  for (const k of ["title", "slug", "issue", "date", "summary", "status"]) {
    if (meta[k] === undefined || meta[k] === "") {
      throw new Error(`${file}: missing "${k}"`);
    }
  }
  if (!/^[a-z0-9-]+$/.test(meta.slug)) throw new Error(`${file}: bad slug`);
  return { ...meta, date: String(meta.date).slice(0, 10), body: m[2], file };
}

/** Issues visible for this build, newest first. Production: approved only. */
export function selectIssues(issues, drafts = false) {
  return issues
    .filter((i) => i.status === "approved" || (drafts && i.status === "draft"))
    .sort((a, b) => b.date.localeCompare(a.date) || b.issue - a.issue);
}

export function loadIssues(dir = "content/insights", drafts = includeDrafts()) {
  const all = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseIssue(readFileSync(join(dir, f), "utf8"), f));
  return selectIssues(all, drafts);
}
