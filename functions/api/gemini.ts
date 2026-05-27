// functions/api/gemini.ts
import { GoogleGenAI } from "@google/genai";
import { buildAiSystemInstruction } from "../../src/content/siteContent";
import { formatTimeIntentResponse, resolveTimeIntent } from "../lib/timeIntent";

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

interface Env {
  API_KEY?: string;
  GEMINI_API_KEY?: string;
  SENTIENT_SITE_MEMORY?: string;
}

interface PagesFunctionContext {
  request: Request;
  env: Env;
}

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

  const apiKey = env?.API_KEY || env?.GEMINI_API_KEY;
  if (!apiKey) {
    return json(
      {
        error: "Missing API key. Set API_KEY (or GEMINI_API_KEY) in Cloudflare Pages environment variables, then redeploy.",
      },
      { status: 500 },
    );
  }

  const model = String(body?.model || "gemini-2.5-flash");

  // OPTIONAL: history format: [{ role: "user"|"model", text: "..." }]
  const history = Array.isArray(body?.history) ? body.history : [];
  const siteMemory = String(env?.SENTIENT_SITE_MEMORY || "").trim();

  const systemInstruction = buildAiSystemInstruction(siteMemory);

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Build contents (history + latest user message)
    const contents = [
      ...history
        .filter((h: any) => h && (h.role === "user" || h.role === "model") && typeof h.text === "string")
        .slice(-12)
        .map((h: any) => ({
          role: h.role,
          parts: [{ text: h.text }],
        })),
      { role: "user", parts: [{ text: message }] },
    ];

    // If you want the model to be able to pull fresh info, you can enable googleSearch tool here.
    // Note: this can increase usage and make rate limits more likely. Turn it on only if needed.
    const tools = body?.googleSearch === true ? [{ googleSearch: {} }] : undefined;

    const config: Record<string, unknown> = {
      systemInstruction,
      temperature: 0.6,
      topP: 0.9,
      maxOutputTokens: 900,
      ...(tools ? { tools } : {}),
    };

    const result = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    // The SDK provides `result.text` in examples. :contentReference[oaicite:0]{index=0}
    const text = String((result as any)?.text || "").trim();

    return json({
      ok: true,
      text,
      model,
    });
  } catch (err: any) {
    const status =
      Number(err?.status) ||
      Number(err?.code) ||
      500;

    // If Gemini throttles you, forward 429 so your UI can show “retry in X seconds”
    if (status === 429) {
      const retryAfter = parseRetryAfterSeconds(err) ?? 30;
      return json(
        {
          error: "Rate limited by Gemini (429).",
          message: String(err?.message || err || ""),
          details: err?.details || null,
          retryAfterSeconds: retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        },
      );
    }

    return json(
      {
        error: "Gemini error",
        message: String(err?.message || err || ""),
        status,
      },
      { status: status >= 400 && status <= 599 ? status : 500 },
    );
  }
};
