// Cloudflare Pages Function: /api/email-report
// POST { email, report: { host, score, summary, checks[] } } -> { ok }
// Emails the website-check report to the visitor who asked for it, through
// Resend. Needs RESEND_API_KEY (and a verified sending domain). Without a key
// it answers 501 { configured: false } so the page can fall back to a personal
// follow-up instead of claiming an email went out.
import { json } from "../lib/http";
import { normalizeTarget } from "../lib/siteCheck";

interface Env {
  RESEND_API_KEY?: string;
  REPORT_FROM_EMAIL?: string;
  REPORT_REPLY_TO?: string;
}

interface ReportInput {
  host?: unknown;
  score?: unknown;
  summary?: unknown;
  checks?: unknown;
}

const DEFAULT_FROM = "Sentient Partners <hello@sentientpartners.ai>";
const DEFAULT_REPLY_TO = "hello@sentientpartners.ai";
const BOOKING_PAGE = "https://sentientpartners.ai";
const STATUS_LABEL = { pass: "Looks good", warn: "Could be better", fail: "Needs attention" } as const;
type Status = keyof typeof STATUS_LABEL;

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_IP = 5;
const MAX_PER_RECIPIENT = 2;
// Best-effort, per-isolate limiters: enough to blunt casual abuse.
const byIp = new Map<string, number[]>();
const byRecipient = new Map<string, number[]>();

function over(store: Map<string, number[]>, key: string, max: number): boolean {
  const now = Date.now();
  const hits = (store.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  store.set(key, hits);
  if (store.size > 5000) store.clear();
  return hits.length > max;
}

const clip = (value: unknown, max: number) =>
  String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface CleanReport {
  host: string;
  score: number;
  summary: string;
  checks: { label: string; status: Status; detail: string }[];
}

function cleanReport(input: ReportInput): CleanReport | null {
  const target = normalizeTarget(clip(input.host, 253));
  if (!target.url) return null;
  const score = Number(input.score);
  if (!Number.isFinite(score)) return null;
  if (!Array.isArray(input.checks) || input.checks.length === 0) return null;
  const checks = input.checks.slice(0, 12).map((raw) => {
    const c = (raw ?? {}) as Record<string, unknown>;
    const status: Status = c.status === "pass" || c.status === "warn" ? c.status : "fail";
    return { label: clip(c.label, 80), status, detail: clip(c.detail, 300) };
  });
  if (checks.some((c) => !c.label)) return null;
  return {
    host: target.url.hostname.replace(/^www\./, ""),
    score: Math.max(0, Math.min(100, Math.round(score))),
    summary: clip(input.summary, 700),
    checks,
  };
}

function renderText(r: CleanReport): string {
  const lines = r.checks.map((c) => `- ${c.label}: ${STATUS_LABEL[c.status]}. ${c.detail}`).join("\n");
  return `Your website check for ${r.host}: ${r.score}/100\n\n${r.summary}\n\n${lines}\n\nWant a walkthrough of what's worth fixing? Book a 20-minute intro call at ${BOOKING_PAGE} or just reply to this email.\n\nTroy\nSentient Partners`;
}

function renderHtml(r: CleanReport): string {
  const rows = r.checks
    .map(
      (c) =>
        `<tr><td style="padding:10px 0;border-top:1px solid #e5e2da"><strong>${escapeHtml(c.label)}</strong> <span style="color:#6b6b6b">· ${STATUS_LABEL[c.status]}</span><br>${escapeHtml(c.detail)}</td></tr>`,
    )
    .join("");
  return `<div style="font-family:Georgia,serif;color:#0D1F4E;max-width:560px;margin:0 auto;line-height:1.5">
<h2 style="margin:0 0 4px">Your website check</h2>
<p style="margin:0 0 16px;color:#6b6b6b">${escapeHtml(r.host)} · ${r.score}/100</p>
<p>${escapeHtml(r.summary)}</p>
<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows}</table>
<p style="margin-top:24px">Want a walkthrough of what's worth fixing? <a href="${BOOKING_PAGE}">Book a 20-minute intro call</a> or just reply to this email.</p>
<p>Troy<br>Sentient Partners</p></div>`;
}

export const onRequestGet = async () =>
  json({ ok: true, route: "/api/email-report", note: "POST JSON { email, report }." });

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const key = String(env.RESEND_API_KEY ?? "").trim();
  if (!key) {
    return json({ ok: false, configured: false, error: "Report email isn't set up yet." }, { status: 501 });
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (over(byIp, ip, MAX_PER_IP)) {
    return json({ ok: false, error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let body: { email?: unknown; report?: ReportInput } = {};
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Send JSON { email, report }." }, { status: 400 });
  }

  const email = clip(body.email, 254).toLowerCase();
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)) {
    return json({ ok: false, error: "That email address doesn't look right." }, { status: 400 });
  }
  const report = cleanReport(body.report ?? {});
  if (!report) {
    return json({ ok: false, error: "Run the website check first." }, { status: 400 });
  }
  if (over(byRecipient, email, MAX_PER_RECIPIENT)) {
    return json({ ok: false, error: "That report was already sent. Check your inbox." }, { status: 429 });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.REPORT_FROM_EMAIL || DEFAULT_FROM,
        to: [email],
        reply_to: env.REPORT_REPLY_TO || DEFAULT_REPLY_TO,
        subject: `Your website check for ${report.host}`,
        text: renderText(report),
        html: renderHtml(report),
      }),
    });
    if (!response.ok) {
      return json({ ok: false, error: "We couldn't send the email." }, { status: 502 });
    }
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: "We couldn't send the email." }, { status: 502 });
  }
};
