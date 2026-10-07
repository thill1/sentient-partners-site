// functions/api/gemini.ts
import { buildAiSystemInstruction } from "../../src/content/siteContent";
import { formatTimeIntentResponse, resolveTimeIntent } from "../lib/timeIntent";
import { generateChatReply, resolveKeyCandidates } from "../lib/aiChat";

// Cloudflare Pages Function: /api/gemini
// - GET  -> simple JSON health response (so you can confirm it’s not being rewritten to index.html)
// - POST -> calls Groq (gsk_ key) or Google Gemini (AIza key) server-side (key never exposed to client),
//            walking an ordered model list so one deprecated/rate-limited model can't break chat
// - Properly forwards rate limits as 429 with Retry-After (instead of hiding as 500)

function json(data: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
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
  GROQ_API_KEY?: string;
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

  const candidates = resolveKeyCandidates(env);
  if (!candidates.length) {
    return json(
      {
        error: "Missing API key. Set GROQ_API_KEY, API_KEY, or GEMINI_API_KEY in Cloudflare Pages environment variables, then redeploy.",
      },
      { status: 500 },
    );
  }

  const siteMemory = String(env?.SENTIENT_SITE_MEMORY || "").trim();
  const systemInstruction = buildAiSystemInstruction(siteMemory);
  const history = Array.isArray(body?.history) ? body.history : [];

  const result = await generateChatReply(candidates, {
    systemInstruction,
    history,
    message,
    googleSearch: body?.googleSearch === true,
  });

  if (result.ok) {
    return json({
      ok: true,
      text: result.text,
      model: result.model,
    });
  }

  console.warn("AI chat failed on all models", JSON.stringify(result.attempts));

  // Forward throttling as 429 + Retry-After so the UI can show "retry in X seconds".
  if (result.status === 429) {
    const retryAfter = result.retryAfterSeconds ?? 30;
    return json(
      {
        error: result.error,
        message: result.message,
        retryAfterSeconds: retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  return json(
    {
      error: result.error,
      message: result.message,
      status: result.status,
    },
    { status: result.status },
  );
};
