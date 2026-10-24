/**
 * Which configured key is a Gemini key. `API_KEY` is a legacy name that may hold
 * a Groq key (gsk_...), so it only counts as Gemini when it is not one.
 */
export interface GeminiKeyEnv {
  GEMINI_LIVE_API_KEY?: string;
  GEMINI_API_KEY?: string;
  API_KEY?: string;
}

export function geminiKey(env: GeminiKeyEnv | undefined, { live = false } = {}): string {
  const legacy = String(env?.API_KEY ?? "").trim();
  const candidates = [live ? env?.GEMINI_LIVE_API_KEY : undefined, env?.GEMINI_API_KEY, legacy.startsWith("gsk_") ? "" : legacy];
  for (const c of candidates) {
    const v = String(c ?? "").trim();
    if (v) return v;
  }
  return "";
}

export function groqKey(env: { GROQ_API_KEY?: string; API_KEY?: string } | undefined): string {
  const legacy = String(env?.API_KEY ?? "").trim();
  return String(env?.GROQ_API_KEY || (legacy.startsWith("gsk_") ? legacy : "")).trim();
}
