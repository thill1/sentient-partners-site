/**
 * The visitor's confirmation email. Fixed wording: the only visitor text in it is
 * their first name, escaped. Sent through Resend after FormSubmit took the lead.
 */

export const BOOKING_LINK = "https://cal.com/sentient-partners-strategy/introductory-call";
export const CONFIRM_FROM = "Sentient Partners <hello@sentientpartners.ai>";
export const CONFIRM_REPLY_TO = "hello@sentientpartners.ai";
export const CONFIRM_SUBJECT = "Thanks for reaching out to Sentient Partners";

const EMAIL = /^[^\s@,;<>"'()\\]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export const isEmail = (value: string): boolean => value.length <= 254 && EMAIL.test(value);

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** First word of the name, letters only, so the email can't carry a message. */
export function firstName(raw: unknown): string {
  const first = String(raw ?? "").trim().split(/\s+/)[0] ?? "";
  if (first.includes("@")) return "";
  const clean = first.replace(/[^\p{L}\p{M}'-]/gu, "").slice(0, 30);
  return clean.length >= 1 ? clean : "";
}

export function renderConfirmation(name: string) {
  const greeting = name ? `Hi ${name},` : "Hello,";
  const text = [
    greeting,
    "",
    "Thanks for reaching out to Sentient Partners. Troy has your message and will reply personally.",
    "",
    `If you'd like to talk sooner, book a 20-minute introductory call: ${BOOKING_LINK}`,
    "",
    "Sentient Partners",
    "hello@sentientpartners.ai",
  ].join("\n");
  const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.6;color:#0D1F4E;max-width:560px">
<p>${escapeHtml(greeting)}</p>
<p>Thanks for reaching out to Sentient Partners. Troy has your message and will reply personally.</p>
<p>If you'd like to talk sooner, <a href="${BOOKING_LINK}" style="color:#0D1F4E">book a 20-minute introductory call</a>.</p>
<p style="color:#5A6A94">Sentient Partners<br><a href="mailto:hello@sentientpartners.ai" style="color:#5A6A94">hello@sentientpartners.ai</a></p>
</div>`;
  return { text, html };
}

/** Only our own pages may ask for a confirmation. */
export function allowedOrigin(request: Request): boolean {
  const raw = request.headers.get("origin") || request.headers.get("referer") || "";
  let host = "";
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    return false;
  }
  return (
    host === "sentientpartners.ai" ||
    host === "www.sentientpartners.ai" ||
    host === "sentient-partners-site.pages.dev" ||
    host.endsWith(".sentient-partners-site.pages.dev")
  );
}

// ---- Rate limits ----------------------------------------------------------------------
// The Cache API holds counters per data centre; a per-isolate map backs it up.

export const LIMIT_PER_HOUR = 3;
const WINDOW_SECONDS = 3600;
const memory = new Map<string, { count: number; resetAt: number }>();

export function resetConfirmLimitsForTests() {
  memory.clear();
}

async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

interface CacheLike {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

const defaultCache = (): CacheLike | undefined =>
  (globalThis as { caches?: { default?: CacheLike } }).caches?.default;

/** Counts one send for each key. True when any key is already at its limit. */
export async function overConfirmLimit(keys: string[], now = Date.now(), cache = defaultCache()): Promise<boolean> {
  const ids = await Promise.all(keys.map(hash));
  // Memory layer first, with no await between check and raise.
  for (const id of ids) {
    const entry = memory.get(id);
    if (entry && entry.resetAt > now && entry.count >= LIMIT_PER_HOUR) return true;
  }
  for (const id of ids) {
    const entry = memory.get(id);
    if (entry && entry.resetAt > now) entry.count += 1;
    else memory.set(id, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
  }
  if (!cache) return false;
  try {
    const counts = await Promise.all(
      ids.map(async (id) => {
        const req = new Request(`https://confirm-limit.sentient.internal/${id}`);
        const hit = await cache.match(req);
        const count = hit ? Number(await hit.text()) || 0 : 0;
        return { req, count };
      }),
    );
    if (counts.some((c) => c.count >= LIMIT_PER_HOUR)) return true;
    await Promise.all(
      counts.map(({ req, count }) =>
        cache.put(req, new Response(String(count + 1), { headers: { "cache-control": `max-age=${WINDOW_SECONDS}` } })),
      ),
    );
  } catch {
    // The memory layer already counted this one.
  }
  return false;
}
