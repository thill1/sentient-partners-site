// functions/lib/aiChat.ts
// Provider-aware chat completion with ordered model fallbacks.
// - Provider is detected from the key prefix: "gsk_" => Groq, "AIza" => Google Gemini.
// - Each provider has an ordered list of current model IDs. When a model is
//   unavailable (404 / model_not_found / decommissioned 400 / 403 access),
//   rate limited (429), or the upstream errors (5xx / network), the next model is tried.

export type AiProvider = "groq" | "gemini";

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export interface ChatRequest {
  systemInstruction: string;
  history: ChatTurn[];
  message: string;
  googleSearch?: boolean;
}

export type ChatResult =
  | { ok: true; text: string; model: string; provider: AiProvider }
  | {
      ok: false;
      status: number;
      error: string;
      message: string;
      provider?: AiProvider;
      model?: string;
      retryAfterSeconds?: number;
      attempts: { provider: AiProvider; model: string; status: number }[];
    };

// Current production model IDs (checked against provider docs, Oct 2026).
// Groq: llama-3.3-70b-versatile / llama-3.1-8b-instant moved to Enterprise-only,
// so developer keys get model_not_found; GPT-OSS models are the developer-plan production models.
export const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
] as const;

// Gemini: 3.8 Flash and 3.5 Flash-Lite are the recommended stable models;
// gemini-flash-latest is Google's hot-swapped alias; 2.5 Flash remains for existing users.
export const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
  "gemini-2.5-flash",
] as const;

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

export function detectProvider(apiKey: string): AiProvider | null {
  const key = apiKey.trim();
  if (key.startsWith("gsk_")) return "groq";
  if (key.startsWith("AIza")) return "gemini";
  return null;
}

export interface KeyCandidate {
  provider: AiProvider;
  apiKey: string;
}

/**
 * Builds the ordered list of (provider, key) pairs from env.
 * Keys with an unrecognised prefix are treated as Gemini keys (previous behaviour).
 */
export function resolveKeyCandidates(env: {
  GROQ_API_KEY?: string;
  API_KEY?: string;
  GEMINI_API_KEY?: string;
}): KeyCandidate[] {
  const seen = new Set<string>();
  const out: KeyCandidate[] = [];
  for (const raw of [env?.GROQ_API_KEY, env?.API_KEY, env?.GEMINI_API_KEY]) {
    const apiKey = String(raw || "").trim();
    if (!apiKey || seen.has(apiKey)) continue;
    seen.add(apiKey);
    out.push({ provider: detectProvider(apiKey) ?? "gemini", apiKey });
  }
  return out;
}

/**
 * Should we move on to the next model after this upstream failure?
 * 400 (decommissioned / unsupported parameter for that model), 403 (no access to model),
 * 404 (model_not_found), 408/429 (timeout / rate limit), 5xx and network errors fall through.
 * 401 (invalid key) does not: every model on that key would fail the same way.
 */
export function shouldFallThrough(status: number): boolean {
  if (status === 0) return true; // network error
  if (status === 400 || status === 403 || status === 404 || status === 408 || status === 429) return true;
  return status >= 500;
}

function parseRetryAfter(res: Response | null, bodyText: string): number | undefined {
  const header = res?.headers.get("retry-after");
  if (header && /^\d+(\.\d+)?$/.test(header.trim())) return Math.ceil(Number(header));
  const m = (bodyText || "").match(/"retryDelay"\s*:\s*"(\d+)(?:\.\d+)?s"/i);
  if (m?.[1]) return Number(m[1]);
  return undefined;
}

function cleanHistory(history: ChatTurn[]): ChatTurn[] {
  return (Array.isArray(history) ? history : [])
    .filter((h) => h && (h.role === "user" || h.role === "model") && typeof h.text === "string")
    .slice(-6);
}

function isGroqReasoningModel(model: string) {
  return model.startsWith("openai/gpt-oss");
}

export function buildGroqBody(model: string, req: ChatRequest) {
  const messages = [
    { role: "system", content: req.systemInstruction },
    ...cleanHistory(req.history).map((h) => ({
      role: h.role === "model" ? "assistant" : "user",
      content: h.text,
    })),
    { role: "user", content: req.message },
  ];
  const body: Record<string, unknown> = { model, messages, temperature: 0.6 };
  if (isGroqReasoningModel(model)) {
    // Reasoning tokens count toward the completion budget; keep reasoning light and hidden.
    body.reasoning_effort = "low";
    body.include_reasoning = false;
    body.max_completion_tokens = 1500;
  } else {
    body.max_tokens = 900;
  }
  return body;
}

function geminiThinkingConfig(model: string): Record<string, unknown> | undefined {
  // Thinking tokens share the output budget; keep thinking minimal so replies are not truncated.
  if (/^gemini-3/.test(model)) return { thinkingLevel: "low" };
  if (/^gemini-2\.5-flash/.test(model)) return { thinkingBudget: 0 };
  return undefined;
}

export function buildGeminiBody(model: string, req: ChatRequest) {
  const thinkingConfig = geminiThinkingConfig(model);
  return {
    systemInstruction: { parts: [{ text: req.systemInstruction }] },
    contents: [
      ...cleanHistory(req.history).map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: "user", parts: [{ text: req.message }] },
    ],
    generationConfig: {
      temperature: 0.6,
      topP: 0.9,
      maxOutputTokens: 900,
      ...(thinkingConfig ? { thinkingConfig } : {}),
    },
    ...(req.googleSearch === true ? { tools: [{ googleSearch: {} }] } : {}),
  };
}

function extractGroqText(data: any): string {
  return String(data?.choices?.[0]?.message?.content || "").trim();
}

function extractGeminiText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((p: any) => typeof p?.text === "string" && !p?.thought)
    .map((p: any) => p.text)
    .join("")
    .trim();
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export async function generateChatReply(
  candidates: KeyCandidate[],
  req: ChatRequest,
  fetchImpl: FetchLike = fetch,
): Promise<ChatResult> {
  const attempts: { provider: AiProvider; model: string; status: number }[] = [];
  let last: { status: number; body: string; provider: AiProvider; model: string; res: Response | null } | null =
    null;

  for (const { provider, apiKey } of candidates) {
    const models = provider === "groq" ? GROQ_MODELS : GEMINI_MODELS;
    for (const model of models) {
      let res: Response | null = null;
      let bodyText = "";
      try {
        if (provider === "groq") {
          res = await fetchImpl(GROQ_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(buildGroqBody(model, req)),
          });
        } else {
          res = await fetchImpl(GEMINI_URL(model), {
            method: "POST",
            headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify(buildGeminiBody(model, req)),
          });
        }
      } catch (err: any) {
        bodyText = String(err?.message || err || "network error");
        attempts.push({ provider, model, status: 0 });
        last = { status: 0, body: bodyText, provider, model, res: null };
        continue;
      }

      if (res.ok) {
        const data: any = await res.json().catch(() => ({}));
        const text = provider === "groq" ? extractGroqText(data) : extractGeminiText(data);
        attempts.push({ provider, model, status: res.status });
        if (text) {
          const actualModel = String((provider === "groq" && data?.model) || model);
          return { ok: true, text, model: actualModel, provider };
        }
        // Empty completion (e.g. token budget used by reasoning): try the next model.
        last = { status: 502, body: "Empty response from model.", provider, model, res };
        continue;
      }

      bodyText = await res.text().catch(() => "");
      attempts.push({ provider, model, status: res.status });
      last = { status: res.status, body: bodyText, provider, model, res };
      if (!shouldFallThrough(res.status)) break; // e.g. 401 bad key: skip to next key
    }
  }

  if (!last) {
    return {
      ok: false,
      status: 500,
      error: "Missing API key.",
      message: "",
      attempts,
    };
  }

  const status = last.status >= 400 && last.status <= 599 ? last.status : 502;
  const label = last.provider === "groq" ? "Groq" : "Gemini";
  return {
    ok: false,
    status,
    error: status === 429 ? `Rate limited by ${label} (429).` : `${label} API error`,
    message: last.body,
    provider: last.provider,
    model: last.model,
    ...(status === 429 ? { retryAfterSeconds: parseRetryAfter(last.res, last.body) ?? 30 } : {}),
    attempts,
  };
}
