/**
 * Groq chat completions with a model fallback chain.
 *
 * Groq retires models on a schedule (llama-3.3-70b-versatile and
 * llama-3.1-8b-instant were shut down for non-enterprise accounts on
 * 2026-08-16), and a retired model returns 404 `model_not_found`. Rather than
 * hard-coding one model, try an optional pinned model (env GROQ_MODEL) and
 * then current production models in order, moving on when a model is
 * missing, refused or rate limited.
 */
export const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"] as const;

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqResult {
  ok: boolean;
  text: string;
  model: string;
  status: number;
  error?: string;
}

const isReasoningModel = (model: string) => model.startsWith("openai/gpt-oss");

export async function groqChat(options: {
  apiKey: string;
  messages: GroqMessage[];
  pinnedModel?: string;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}): Promise<GroqResult> {
  const models = [options.pinnedModel?.trim(), ...GROQ_MODELS].filter(
    (m, i, all): m is string => !!m && all.indexOf(m) === i,
  );
  let last: GroqResult = { ok: false, text: "", model: "", status: 0, error: "no_models" };

  for (const model of models) {
    const reasoning = isReasoningModel(model);
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: options.signal,
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.6,
        // Reasoning models spend tokens thinking before they answer, so they
        // get headroom beyond the visible reply.
        max_completion_tokens: (options.maxTokens ?? 900) + (reasoning ? 1200 : 0),
        ...(reasoning ? { reasoning_effort: "low" } : {}),
        ...(options.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        choices?: { message?: { content?: string } }[];
        model?: string;
      };
      const text = String(data.choices?.[0]?.message?.content ?? "").trim();
      if (text) return { ok: true, text, model: String(data.model || model), status: 200 };
      last = { ok: false, text: "", model, status: 502, error: "empty_reply" };
      continue;
    }

    const detail = await response.text().catch(() => "");
    last = { ok: false, text: "", model, status: response.status, error: detail.slice(0, 500) };
    // Missing/retired model, model access refused, bad model parameters or a
    // rate limit: try the next model. Auth failures won't improve, so stop.
    if (response.status === 401) break;
    if ([400, 403, 404, 429, 503].includes(response.status)) continue;
    break;
  }
  return last;
}
