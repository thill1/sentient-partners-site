// Cloudflare Pages Function: /api/site-check
// POST { url } -> { ok, host, score, checks[], summary, aiSummary }
// Fetches the visitor's homepage server-side, grades the basics that win local
// customers, and (when a model key is configured) writes a short plain-English
// summary. Read-only: it never submits forms or follows more than redirects.
import { json } from "../lib/http";
import {
  analyzeHtml,
  fallbackSummary,
  normalizeTarget,
  scoreChecks,
  type CheckResult,
} from "../lib/siteCheck";
import { groqChat } from "../lib/groq";

interface Env {
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  API_KEY?: string;
  GEMINI_API_KEY?: string;
}

const MAX_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 9000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 6;
// Best-effort, per-isolate limiter: enough to blunt casual abuse.
const recent = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > MAX_PER_WINDOW;
}

async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    text += decoder.decode(value, { stream: true });
    if (size > MAX_BYTES) {
      await reader.cancel();
      break;
    }
  }
  return text;
}

export const onRequestGet = async () =>
  json({ ok: true, route: "/api/site-check", note: "POST JSON { url }." });

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (limited(ip)) {
    return json(
      { ok: false, error: "That's a lot of checks in a short time. Please try again in a few minutes." },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  let body: { url?: string } = {};
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Send JSON { url }." }, { status: 400 });
  }
  const { url, error } = normalizeTarget(String(body.url ?? ""));
  if (!url) return json({ ok: false, error }, { status: 400 });

  const started = Date.now();
  let response: Response;
  try {
    response = await fetch(url.href, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SentientPartnersSiteCheck/1.0; +https://sentientpartners.ai/)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch {
    return json(
      {
        ok: false,
        error: `We couldn't reach ${url.hostname}. Check the address, or the site may be blocking automated visits.`,
      },
      { status: 502 },
    );
  }
  const responseMs = Date.now() - started;
  const finalUrl = response.url || url.href;
  // A redirect must not land somewhere private either.
  const landed = normalizeTarget(finalUrl);
  if (!landed.url) {
    return json({ ok: false, error: "That address redirects somewhere we can't check." }, { status: 400 });
  }
  if (!response.ok) {
    return json(
      { ok: false, error: `${url.hostname} answered with an error (${response.status}).` },
      { status: 502 },
    );
  }
  const type = response.headers.get("content-type") ?? "";
  if (!/html/i.test(type)) {
    return json({ ok: false, error: "That address isn't a web page." }, { status: 400 });
  }

  const html = await readCapped(response);
  const checks = analyzeHtml(html, {
    finalUrl,
    status: response.status,
    responseMs,
    htmlBytes: html.length,
  });
  const score = scoreChecks(checks);
  const host = landed.url.hostname.replace(/^www\./, "");
  const summary = fallbackSummary(host, checks, score);
  const aiSummary = await summarize(env, host, score, checks).catch(() => null);

  return json({ ok: true, host, url: finalUrl, score, checks, summary: aiSummary ?? summary, ai: !!aiSummary });
};

const SYSTEM = `You write a short, plain-English website check-up for the owner of a local business.
Rules: 3 sentences, under 75 words, no headings or lists, no em dashes.
Start with what the site already does well, then name the one or two changes that would most help it win local customers, and why.
Never mention prices, guarantees, statistics you weren't given, or Sentient Partners. Don't invent facts beyond the check results.`;

async function summarize(env: Env, host: string, score: number, checks: CheckResult[]): Promise<string | null> {
  const key = String(env.GROQ_API_KEY || env.API_KEY || env.GEMINI_API_KEY || "").trim();
  if (!key) return null;
  const facts = checks.map((c) => `- ${c.label}: ${c.status.toUpperCase()}. ${c.detail}`).join("\n");
  const prompt = `Website: ${host}\nScore: ${score}/100\nChecks:\n${facts}`;
  const signal = AbortSignal.timeout(9000);

  if (key.startsWith("gsk_")) {
    const result = await groqChat({
      apiKey: key,
      pinnedModel: env.GROQ_MODEL,
      signal,
      temperature: 0.4,
      maxTokens: 220,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
    });
    return result.ok ? clean(result.text) : null;
  }

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 220 },
      }),
    },
  );
  if (!r.ok) return null;
  const data = (await r.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return clean(data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join(""));
}

function clean(text: string | undefined): string | null {
  const t = String(text ?? "")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > 20 ? t.slice(0, 600) : null;
}
