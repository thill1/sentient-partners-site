// Cloudflare Pages Function: /api/demo-chat
// POST { message, history? } -> { ok, reply, lead }
// Powers the live "AI Chat Assistants" window: a fictional HVAC company
// (Hearth & Home) answers the visitor and writes up the lead as it goes.
import { json } from "../lib/http";

interface Env {
  GROQ_API_KEY?: string;
  API_KEY?: string;
  GEMINI_API_KEY?: string;
}

interface Turn {
  role: "user" | "model";
  text: string;
}

export interface DemoLead {
  intent?: string;
  need?: string;
  location?: string;
  timing?: string;
  routed?: string;
}

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const recent = new Map<string, number[]>();

const SYSTEM = `You are the website chat assistant for Hearth & Home Heating & Air, a fictional HVAC company in Auburn, California, shown as a live demo on the Sentient Partners website.
Behave exactly like a real business's assistant would. Be warm, brief and practical: at most two short sentences per reply, no lists, no em dashes.
You are an AI assistant; if asked, say so plainly.
Goals: understand what the customer needs, where they are (city or neighborhood), and when they'd like a visit, then offer to have the team confirm a time.
Never quote prices, discounts or guarantees; say the team confirms pricing after a quick look. Never invent technician names or exact arrival times.
Safety: if the customer mentions a gas smell, carbon monoxide, smoke, sparks or a medical risk, tell them to leave the home and call 911 or the gas company first, and route to a person urgently.
If the question has nothing to do with heating, cooling or the company, answer in one friendly sentence and steer back.
Respond ONLY with JSON: {"reply": string, "lead": {"intent": string, "need": string, "location": string, "timing": string, "routed": string}}.
In "lead", fill only what the customer has actually said so far (short phrases, under 8 words each), and use "" for anything unknown. "routed" is who should get this lead, for example "Service scheduling", "Sales estimate" or "Urgent: on-call tech".`;

function limited(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > MAX_PER_WINDOW;
}

export function parseModelJson(raw: string): { reply: string; lead: DemoLead } | null {
  const text = String(raw || "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const data = JSON.parse(text.slice(start, end + 1)) as { reply?: unknown; lead?: Record<string, unknown> };
    const reply = String(data.reply ?? "").replace(/\s*[—–]\s*/g, ", ").trim();
    if (!reply) return null;
    const lead: DemoLead = {};
    for (const k of ["intent", "need", "location", "timing", "routed"] as const) {
      const v = String(data.lead?.[k] ?? "").trim();
      if (v && v.length <= 80) lead[k] = v;
    }
    return { reply: reply.slice(0, 400), lead };
  } catch {
    return null;
  }
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  if (limited(request.headers.get("cf-connecting-ip") ?? "unknown")) {
    return json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  let body: { message?: unknown; history?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const message = String(body.message ?? "").trim().slice(0, 300);
  if (!message) return json({ ok: false, error: "empty" }, { status: 400 });
  const history: Turn[] = (Array.isArray(body.history) ? body.history : [])
    .filter(
      (t): t is Turn =>
        !!t && typeof t === "object" && (t.role === "user" || t.role === "model") && typeof t.text === "string",
    )
    .slice(-8)
    .map((t) => ({ role: t.role, text: t.text.slice(0, 400) }));

  const key = String(env.GROQ_API_KEY || env.API_KEY || env.GEMINI_API_KEY || "").trim();
  if (!key) return json({ ok: false, error: "not_configured" }, { status: 503 });
  const signal = AbortSignal.timeout(12000);

  try {
    let raw = "";
    if (key.startsWith("gsk_")) {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal,
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.5,
          max_tokens: 300,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            ...history.map((t) => ({ role: t.role === "model" ? "assistant" : "user", content: t.text })),
            { role: "user", content: message },
          ],
        }),
      });
      if (!r.ok) return json({ ok: false, error: "model_error" }, { status: 502 });
      const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
      raw = data.choices?.[0]?.message?.content ?? "";
    } else {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM }] },
            contents: [
              ...history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
              { role: "user", parts: [{ text: message }] },
            ],
            generationConfig: { temperature: 0.5, maxOutputTokens: 300, responseMimeType: "application/json" },
          }),
        },
      );
      if (!r.ok) return json({ ok: false, error: "model_error" }, { status: 502 });
      const data = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    }
    const parsed = parseModelJson(raw);
    if (!parsed) return json({ ok: false, error: "bad_model_output" }, { status: 502 });
    return json({ ok: true, ...parsed });
  } catch {
    return json({ ok: false, error: "timeout" }, { status: 504 });
  }
};
