/** Test support: read links out of rendered HTML without a DOM. */

export interface MarkupLink {
  label: string;
  href: string;
}

const decodeEntities = (text: string): string =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

/** Visible text of an HTML fragment: tags removed, entities decoded, whitespace collapsed. */
export const textOf = (html: string): string =>
  decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

/** Every `<a href>` in the markup, in document order, as its visible label and href. */
export function linksIn(html: string): MarkupLink[] {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(([, attributes, inner]) => ({
    label: textOf(inner),
    href: decodeEntities(attributes.match(/\bhref="([^"]*)"/)?.[1] ?? ""),
  }));
}

/**
 * The inner HTML of the first element whose opening tag matches `openTag`
 * (for example /<nav class="desktop-nav"[^>]*>/), up to its matching close.
 */
export function elementHtml(html: string, openTag: RegExp): string {
  const open = openTag.exec(html);
  if (!open) throw new Error(`markupLinks: no element matching ${openTag} in the markup`);
  const tagName = open[0].match(/^<([a-z0-9]+)/i)?.[1];
  if (!tagName) throw new Error(`markupLinks: ${openTag} did not match an opening tag`);
  const start = open.index + open[0].length;
  const tags = new RegExp(`<(/?)${tagName}\\b[^>]*>`, "gi");
  tags.lastIndex = start;
  let depth = 1;
  for (let tag = tags.exec(html); tag; tag = tags.exec(html)) {
    depth += tag[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, tag.index);
  }
  throw new Error(`markupLinks: element matching ${openTag} is never closed`);
}
