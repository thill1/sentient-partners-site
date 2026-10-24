/**
 * Text for the voice to say. Links and email addresses are shown in the chat
 * instead of being read out character by character.
 */
const MD_LINK = /\[([^\]]+)\]\((?:https?:\/\/|mailto:)[^)\s]+\)/gi;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>()]+|\b(?:[a-z0-9-]+\.)+(?:com|ai|io|net|org|co|dev|app)\/[^\s<>()]*/gi;

export function toSpeakable(text: string): string {
  return String(text || "")
    .replace(MD_LINK, "$1")
    .replace(EMAIL, "the email address in the chat")
    .replace(URL_RE, "the link in the chat")
    .replace(/\(\s*(the (?:link|email address) in the chat)\s*\)/g, "$1")
    .replace(/\b(the (?:link|email address) in the chat)([.,;:!?]*)(\s+\1)+/g, "$1$2")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export type RichPart =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string };

const LINKABLE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\bhttps?:\/\/[^\s<>()]+|\bwww\.[^\s<>()]+/gi;

/** Splits text into plain runs and clickable links (URLs and email addresses). */
export function toRichParts(text: string): RichPart[] {
  const source = String(text || "");
  const parts: RichPart[] = [];
  let last = 0;
  for (const match of source.matchAll(LINKABLE)) {
    let raw = match[0];
    const trailing = raw.match(/[.,;:!?'")\]]+$/)?.[0] ?? "";
    raw = raw.slice(0, raw.length - trailing.length);
    const start = match.index ?? 0;
    if (start > last) parts.push({ kind: "text", text: source.slice(last, start) });
    const href = raw.includes("@") && !/^https?:/i.test(raw) ? `mailto:${raw}` : /^www\./i.test(raw) ? `https://${raw}` : raw;
    parts.push({ kind: "link", text: raw, href });
    last = start + raw.length;
  }
  if (last < source.length) parts.push({ kind: "text", text: source.slice(last) });
  return parts;
}
