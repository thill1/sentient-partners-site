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
const DEFAULT_CHAT_MODELS = ["gemini-3.8-flash", "gemini-2.5-flash"];
const unavailableModels = new Set<string>();

const statusOf = (err: any): number => Number(err?.status) || Number(err?.code) || 500;

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

    for (const model of models) {
      const generate = async (convo: unknown[]): Promise<ModelTurn> => {
        let attempts = 0;
        for (;;) {
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
              },
            });
            const calls = (result?.functionCalls ?? []).map((c: any) => ({ name: String(c?.name || ""), args: c?.args }));
            return { text: String(result?.text || ""), calls, content: result?.candidates?.[0]?.content };
          } catch (err: any) {
            attempts += 1;
            const status = statusOf(err);
            if (attempts < 3 && (status === 503 || status === 429)) {
              await new Promise((resolve) => setTimeout(resolve, 300 * attempts));
              continue;
            }
            throw err;
          }
        }
      };
      try {
        const { text, ui } = await runChat(generate, contents, env, { ip, timeZone, now });
        return json({ ok: true, text, model, ui });
      } catch (err: any) {
        lastError = err;
        if (statusOf(err) === 404) unavailableModels.add(model);
      }
    }
  }

  if (groqKey) {
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
      });
      if (result.ok) return json({ ok: true, text: result.text, model: result.model });
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
