/**
 * First-party, cookieless click counts. No IPs, user agents or IDs are stored:
 * only a daily tally per event and label, e.g. { "book_call|hero": 3 }.
 */
export const TRACK_EVENTS = [
  "book_call",
  "phone",
  "chat_open",
  "chat_send",
  "voice_start",
  "cal_link",
  "tool_use",
  "template_download",
  "capabilities_pdf",
] as const;
export type TrackEvent = (typeof TRACK_EVENTS)[number];

export const isTrackEvent = (v: unknown): v is TrackEvent =>
  typeof v === "string" && (TRACK_EVENTS as readonly string[]).includes(v);

/** Labels are short slugs we choose (e.g. "hero", "missed-call"), never free text. */
export const cleanLabel = (v: unknown): string =>
  String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9._/-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "-";

export const dayKey = (d = new Date()) => `track:${d.toISOString().slice(0, 10)}`;

export function addCount(raw: string | null, key: string): string {
  let counts: Record<string, number> = {};
  try {
    counts = raw ? JSON.parse(raw) : {};
  } catch {
    counts = {};
  }
  if (Object.keys(counts).length >= 500 && !(key in counts)) return JSON.stringify(counts);
  counts[key] = (counts[key] ?? 0) + 1;
  return JSON.stringify(counts);
}
