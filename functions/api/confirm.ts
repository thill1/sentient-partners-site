import { allowedOrigin, CONFIRM_FROM, CONFIRM_REPLY_TO, CONFIRM_SUBJECT, firstName, isEmail, overConfirmLimit, renderConfirmation } from "../lib/visitorConfirm";

/**
 * POST /api/confirm { email, name, company? }
 * Emails the visitor a fixed thank-you after their message reached hello@.
 * Always answers { ok: true } quickly so it never blocks or reveals anything;
 * it simply does nothing when Resend is not set up or a check fails.
 */

interface ConfirmEnv {
  RESEND_API_KEY?: string;
  CONFIRM_FROM_EMAIL?: string;
}

const done = (status = 200) =>
  new Response(JSON.stringify({ ok: status === 200 }), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export const onRequestPost: PagesFunction<ConfirmEnv> = async ({ request, env }) => {
  if (!allowedOrigin(request)) return done(403);
  const key = String(env.RESEND_API_KEY ?? "").trim();
  if (!key) return done();

  let body: { email?: unknown; name?: unknown; company?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return done();
  }
  // Honeypot: a hidden field people never fill in.
  if (String(body.company ?? "").trim()) return done();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!isEmail(email)) return done();

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (await overConfirmLimit([`ip:${ip}`, `to:${email}`])) return done();

  const { text, html } = renderConfirmation(firstName(body.name));
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: String(env.CONFIRM_FROM_EMAIL || "").trim() || CONFIRM_FROM,
        to: [email],
        reply_to: CONFIRM_REPLY_TO,
        subject: CONFIRM_SUBJECT,
        text,
        html,
      }),
    });
  } catch {
    // Silent: the lead already reached hello@.
  }
  return done();
};

export const onRequest: PagesFunction<ConfirmEnv> = async () =>
  new Response(JSON.stringify({ error: "POST only." }), { status: 405, headers: { allow: "POST", "content-type": "application/json" } });
