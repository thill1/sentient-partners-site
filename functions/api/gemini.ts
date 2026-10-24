// functions/api/gemini.ts
import { GoogleGenAI } from "@google/genai";
import { buildAiSystemInstruction } from "../../src/content/siteContent";
import { formatTimeIntentResponse, resolveTimeIntent } from "../lib/timeIntent";
import { groqChat } from "../lib/groq";
import { geminiKey as geminiKeyOf, groqKey as groqKeyOf } from "../lib/geminiKey";
import { chatToolConfig, runChat, type ModelTurn } from "../lib/chatAgent";
import { validTimeZone, type AssistantEnv } from "../lib/assistantTools";

// Cloudflare Pages Function: /api/gemini
// - GET  -> simple JSON health response (so you can confirm it’s not being rewritten to index.html)
// - POST -> calls Gemini via server-side API_KEY (never exposed to client)
// - Properly forwards Gemini rate limits as 429 with Retry-After (instead of hiding as 500)

function json(data: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function parseRetryAfterSeconds(err: any): number | null {
  // Gemini errors often include RetryInfo.retryDelay like "34s" somewhere inside details
  const raw = JSON.stringify(err ?? {});
  const m = raw.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (m?.[1]) return Number(m[1]);
  return null;
}

export const onRequestGet = async () => {
  return json({
    ok: true,
    route: "/api/gemini",
    note: "POST JSON { message, history?, model? } to use Gemini.",
    time: new Date().toISOString(),
  });
};

interface Env extends AssistantEnv {
  API_KEY?: string;
  GEMINI_API_KEY?: string;
  GEMINI_CHAT_MODEL?: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  SENTIENT_SITE_MEMORY?: string;
}

interface PagesFunctionContext {
  request: Request;
  env: Env;
}

/** Newest first. A model id that Google does not know is remembered and skipped. */
/**
 * Stable model first. gemini-3.8-flash was first and is often overloaded
 * (503/429) or silent for 60 s+, which with no timeout hung the chat until
 * Safari gave up ("Load failed"). It stays as a fallback.
 */
const DEFAULT_CHAT_MODELS = ["gemini-2.5-flash", "gemini-3.8-flash"];
const unavailableModels = new Set<string>();
/** Models that just timed out or were overloaded rest for a while (per isolate). */
const coolingUntil = new Map<string, number>();
const COOL_MS = 5 * 60_000;

const statusOf = (err: any): number => Number(err?.status) || Number(err?.code) || 500;

/** Whole request budget. Past it the visitor gets the fallback, never a hang. */
export const CHAT_DEADLINE_MS = 20_000;
/** One model call never gets more than this, so a slow model leaves time for the next. */
const MODEL_CALL_MS = 9_000;
/** A model with another behind it gets less, so an overloaded one costs at most this. */
const FIRST_TRY_MS = 4_000;

export const TIMEOUT_REPLY =
  "Sorry, I'm slow to answer right now. You can pick a time for the 20-minute introductory call at https://cal.com/sentient-partners-strategy/introductory-call, or email hello@sentientpartners.ai.";

/** Thinking makes Flash models take 10-60 s per turn; a site chat does not need it. */
export function thinkingFor(model: string): Record<string, unknown> {
  if (/^gemini-2\.5-flash/.test(model)) return { thinkingConfig: { thinkingBudget: 0 } };
  if (/^gemini-[3-9]/.test(model)) return { thinkingConfig: { thinkingLevel: "low" } };
  return {};
}

const THINKING = true;

export const onRequestPost = async (context: PagesFunctionContext) => {
  const { request, env } = context;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = String(body?.message || "").trim();
  if (!message) {
    return json({ error: "Missing `message`." }, { status: 400 });
  }

  const timeIntent = resolveTimeIntent(message);
  if (timeIntent) {
    return json({
      ok: true,
      text: formatTimeIntentResponse(timeIntent),
      model: "deterministic-time",
    });
  }

  const groqKey = groqKeyOf(env);
  const geminiKey = geminiKeyOf(env);
  if (!geminiKey && !groqKey) {
    return json(
      {
        error: "Missing API key. Set GEMINI_API_KEY (or GROQ_API_KEY) in Cloudflare Pages environment variables, then redeploy.",
      },
      { status: 500 },
    );
  }

  const siteMemory = String(env?.SENTIENT_SITE_MEMORY || "").trim();
  const timeZone = validTimeZone(body?.timeZone);
  const now = new Date();
  const history = (Array.isArray(body?.history) ? body.history : [])
    .filter((h: any) => h && (h.role === "user" || h.role === "model") && typeof h.text === "string")
    .slice(-6);
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

  let lastError: any = null;
  const started = Date.now();
  const left = () => CHAT_DEADLINE_MS - (Date.now() - started);
  const timings: string[] = [];

  if (geminiKey) {
    const systemInstruction = buildAiSystemInstruction(siteMemory, { tools: true, now, timeZone });
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const contents = [
      ...history.map((h: any) => ({ role: h.role, parts: [{ text: String(h.text) }] })),
      { role: "user", parts: [{ text: message }] },
    ];
    const models = [String(env?.GEMINI_CHAT_MODEL || "").trim(), ...DEFAULT_CHAT_MODELS].filter(
      (m, i, all) => m && all.indexOf(m) === i && !unavailableModels.has(m),
    );
    // Cooling models go last instead of first.
    models.sort((a, b) => Number((coolingUntil.get(a) ?? 0) > Date.now()) - Number((coolingUntil.get(b) ?? 0) > Date.now()));

    for (const [index, model] of models.entries()) {
      if (left() < 3000) break;
      const cap = index < models.length - 1 ? FIRST_TRY_MS : MODEL_CALL_MS;
      const generate = async (convo: unknown[]): Promise<ModelTurn> => {
        let attempts = 0;
        for (;;) {
          const budget = Math.min(cap, left() - 1500);
          if (budget < 1500) throw Object.assign(new Error("Chat deadline reached"), { status: 504 });
          const t0 = Date.now();
          try {
            const result: any = await ai.models.generateContent({
              model,
              contents: convo as any,
              config: {
                systemInstruction,
                temperature: 0.6,
                topP: 0.9,
                maxOutputTokens: 900,
                ...chatToolConfig(),
                ...(THINKING ? thinkingFor(model) : {}),
                abortSignal: AbortSignal.timeout(budget),
                httpOptions: { timeout: budget },
              },
            });
            timings.push(`${model}:${Date.now() - t0}ms`);
            const calls = (result?.functionCalls ?? []).map((c: any) => ({ name: String(c?.name || ""), args: c?.args }));
            return { text: String(result?.text || ""), calls, content: result?.candidates?.[0]?.content };
          } catch (err: any) {
            timings.push(`${model}:err${statusOf(err)}@${Date.now() - t0}ms`);
            if (err?.name === "AbortError" || err?.name === "TimeoutError") {
              coolingUntil.set(model, Date.now() + COOL_MS);
              throw Object.assign(new Error(`${model} timed out`), { status: 504 });
            }
            attempts += 1;
            const status = statusOf(err);
            if (status === 503 || status === 429) coolingUntil.set(model, Date.now() + COOL_MS);
            if (index === models.length - 1 && attempts < 2 && (status === 503 || status === 429) && left() > 8000) {
              await new Promise((resolve) => setTimeout(resolve, 300 * attempts));
              continue;
            }
            throw err;
          }
        }
      };
      try {
        const { text, ui } = await runChat(generate, contents, env, { ip, timeZone, now });
        return json({ ok: true, text, model, ui, ms: Date.now() - started, timings });
      } catch (err: any) {
        lastError = err;
        if (statusOf(err) === 404) unavailableModels.add(model);
      }
    }
  }

  if (groqKey && left() > 2500) {
    // Last resort: Groq has no calendar tools, so it gets the prompt that says so.
    try {
      const messages = [
        { role: "system" as const, content: buildAiSystemInstruction(siteMemory, { now, timeZone }) },
        ...history.map((h: any) => ({
          role: (h.role === "model" ? "assistant" : "user") as "assistant" | "user",
          content: String(h.text),
        })),
        { role: "user" as const, content: message },
      ];
      const result = await groqChat({
        apiKey: groqKey,
        messages,
        pinnedModel: env?.GROQ_MODEL,
        maxTokens: 900,
        temperature: 0.6,
        signal: AbortSignal.timeout(Math.max(1000, left() - 500)),
      });
      if (result.ok) return json({ ok: true, text: result.text, model: result.model, ms: Date.now() - started, timings });
      if (!lastError) {
        return json(
          { error: "Groq API error", message: result.error ?? "", status: result.status, model: result.model },
          { status: result.status === 429 ? 429 : 502 },
        );
      }
    } catch (err: any) {
      if (!lastError) {
        return json(
          { error: "Connection problem with Groq API", message: String(err?.message || err || "") },
          { status: 502 },
        );
      }
    }
  }

  const err = lastError;
  const status = statusOf(err);
  console.log("chat fallback", status, String(err?.message || err || ""), timings.join(" "));
  if (status !== 429 || left() <= 0) {
    return json({ ok: true, text: TIMEOUT_REPLY, model: "fallback", fallback: true, ms: Date.now() - started, timings });
  }
  if (status === 429) {
    const retryAfter = parseRetryAfterSeconds(err) ?? 30;
    return json(
      {
        error: "Rate limited by Gemini (429).",
        message: String(err?.message || err || ""),
        details: err?.details || null,
        retryAfterSeconds: retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  return json(
    {
      error: "Gemini error",
      message: String(err?.message || err || ""),
      status,
    },
    { status: status >= 400 && status < 600 ? status : 502 },
  );
};
