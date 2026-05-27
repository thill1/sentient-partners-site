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

  const apiKey = String(env?.GROQ_API_KEY || env?.API_KEY || env?.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    return json(
      {
        error: "Missing API key. Set GROQ_API_KEY, API_KEY, or GEMINI_API_KEY in Cloudflare Pages environment variables, then redeploy.",
      },
      { status: 500 },
    );
  }

  const isGroq = apiKey.startsWith("gsk_");
  const siteMemory = String(env?.SENTIENT_SITE_MEMORY || "").trim();
  const systemInstruction = buildAiSystemInstruction(siteMemory);
  const history = Array.isArray(body?.history) ? body.history : [];

  if (isGroq) {
    try {
      // Map history to standard OpenAI format: [{ role: "user"|"assistant", content: "..." }]
      const messages = [
        { role: "system", content: systemInstruction },
        ...history
          .filter((h: any) => h && (h.role === "user" || h.role === "model") && typeof h.text === "string")
          .slice(-12)
          .map((h: any) => ({
            role: h.role === "model" ? "assistant" : "user",
            content: h.text,
          })),
        { role: "user", content: message }
      ];

      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          temperature: 0.6,
          max_tokens: 900,
        }),
      });

      if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        return json(
          {
            error: "Groq API error",
            message: errorText,
            status: groqResponse.status,
          },
          { status: groqResponse.status }
        );
      }

      const data = (await groqResponse.json()) as any;
      const replyText = String(data?.choices?.[0]?.message?.content || "").trim();

      return json({
        ok: true,
        text: replyText,
        model: "llama-3.3-70b-versatile",
      });
    } catch (err: any) {
      return json(
        {
          error: "Connection problem with Groq API",
          message: String(err?.message || err || ""),
        },
        { status: 502 }
      );
    }
  }

  // Fallback to Gemini
  const model = String(body?.model || "gemini-2.5-flash");
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
    const tools = body?.googleSearch === true ? [{ googleSearch: {} }] : undefined;

    const config: Record<string, unknown> = {
      systemInstruction,
      temperature: 0.6,
      topP: 0.9,
      maxOutputTokens: 900,
      ...(tools ? { tools } : {}),
    };

    let result;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        result = await ai.models.generateContent({
          model,
          contents,
          config,
        });
        break; // Successful request
      } catch (err: any) {
        attempts += 1;
        const status = Number(err?.status) || Number(err?.code) || 500;
        const isRetryable = status === 503 || status === 429;

        if (attempts < maxAttempts && isRetryable) {
          // Exponential backoff wait (300ms, 600ms)
          await new Promise((resolve) => setTimeout(resolve, 300 * attempts));
          continue;
        }
        throw err;
      }
    }

    // The SDK provides `result.text` in examples.
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
