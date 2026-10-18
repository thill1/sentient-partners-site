/* global process */
// Insights hub content loader and publishing gate (shared by the build and Vite).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { load as yamlLoad, JSON_SCHEMA } from "js-yaml";

export const SITE = "https://sentientpartners.ai";
export const BOOKING_URL =
  "https://cal.com/sentient-partners-strategy/introductory-call";

export const SOCIAL = {
  linkedin: "LinkedIn",
  x: "X",
  facebook: "Facebook",
  instagram: "Instagram",
};
export const TYPES = ["newsletter", "article", ...Object.keys(SOCIAL)];

/** Filter groups for the archive: slug, label, and which types belong. */
export const FILTERS = [
  { key: "all", label: "All", path: "/insights/", types: TYPES },
  { key: "newsletter", label: "Newsletter", path: "/insights/newsletter/", types: ["newsletter"] },
  { key: "articles", label: "Articles", path: "/insights/articles/", types: ["article"] },
  { key: "social", label: "Social", path: "/insights/social/", types: Object.keys(SOCIAL) },
];

export const isSocial = (i) => i.type in SOCIAL;
export const groupOf = (i) =>
  i.type === "newsletter" ? "newsletter" : i.type === "article" ? "articles" : "social";

export const includeDrafts = (env = process.env) =>
  env.INSIGHTS_INCLUDE_DRAFTS === "1";

const firstLine = (body) =>
  body
    .replace(/^>.*$/gm, "")
    .replace(/[#*_`>[\]()]/g, "")
    .trim()
    .split(/\n\s*\n/)[0]
    .replace(/\s+/g, " ");

const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function parseIssue(raw, file = "") {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`Missing front matter: ${file}`);
  const meta = yamlLoad(m[1], { schema: JSON_SCHEMA }) || {};
  const type = meta.type || "newsletter";
  if (!TYPES.includes(type)) throw new Error(`${file}: unknown type "${type}"`);
  const social = type in SOCIAL;
  const required = ["slug", "date", "status"];
  if (!social) required.push("title");
  if (type === "newsletter") required.push("issue");
  if (social) required.push("external_url");
  for (const k of required) {
    if (meta[k] === undefined || meta[k] === "") throw new Error(`${file}: missing "${k}"`);
  }
  if (!/^[a-z0-9-]+$/.test(meta.slug)) throw new Error(`${file}: bad slug`);
  if (social && !/^https:\/\//.test(meta.external_url)) {
    throw new Error(`${file}: external_url must be https`);
  }
  const body = m[2];
  const summary = meta.summary || meta.excerpt || clip(firstLine(body), 180);
  if (!summary) throw new Error(`${file}: missing "summary"`);
  return {
    ...meta,
    type,
    title: meta.title || clip(firstLine(body), 90),
    summary,
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    sample: meta.sample === true || String(meta.slug).startsWith("sample-"),
    date: String(meta.date).slice(0, 10),
    body,
    file,
  };
}

/**
 * Items visible for this build, newest first. Production: approved, non-sample
 * items only. The preview flag adds drafts; samples never reach production.
 */
export function selectIssues(items, drafts = false) {
  return items
    .filter((i) =>
      drafts
        ? i.status === "approved" || i.status === "draft"
        : i.status === "approved" && !i.sample,
    )
    .sort((a, b) => b.date.localeCompare(a.date) || (b.issue || 0) - (a.issue || 0));
}

export function loadIssues(dir = "content/insights", drafts = includeDrafts()) {
  const all = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .map((f) => parseIssue(readFileSync(join(dir, f), "utf8"), f));
  return selectIssues(all, drafts);
}
