// functions/api/gemini.ts
// Cloudflare Pages Function: POST /api/gemini
// Adds Google Search grounding so the bot can answer real-time questions with sources.

type Role = "user" | "model";

function corsHeaders(origin: string | null) {
  const allowOrigin = origin ?? "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function extractTextFromCandidates(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
    .filter(Boolean)
    .join("");
}

function normalizeHistory(body: any): Array<{ role: Role; parts: Array<{ text: string }> }> {
  // Supports a few common shapes:
  // 1) { message: "hi", history: [{ role:"user"|"model", text:"..." }, ...] }
  // 2) { messages: [{ role:"user"|"model", content:"..." }, ...], message:"..." }
  // 3) { contents: [...] } (already Gemini format)

  if (Array.isArray(body?.contents)) return body.contents;

  const out: Array<{ role: Role; parts: Array<{ text: string }> }> = [];

  const history = Array.isArray(body?.history) ? body.history : [];
  for (const h of history) {
    const role: Role = h?.role === "model" ? "model" : "user";
    const text = typeof h?.text === "string" ? h.text : typeof h?.content === "string" ? h.content : "";
    if (text) out.push({ role, parts: [{ text }] });
  }

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  for (const m of messages) {
    const role: Role = m?.role === "model" ? "model" : "user";
    const text = typeof m?.content === "string" ? m.content : typeof m?.text === "string" ? m.text : "";
    if (text) out.push({ role, parts: [{ text }] });
  }

  const message = typeof body?.message === "string" ? body.message : typeof body?.prompt === "string" ? body.prompt : "";
  if (message) out.push({ role: "user", parts: [{ text: message }] });

  return out;
}

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;
  const origin = request.headers.get("Origin");

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  const apiKey = env?.API_KEY || env?.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing API key in Cloudflare env (API_KEY or GEMINI_API_KEY)." }), {
      status: 500,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  const contents = normalizeHistory(body);
  if (!contents.length) {
    return new Response(JSON.stringify({ error: "No message provided" }), {
      status: 400,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  // ✅ Enable Google Search grounding (model decides when to search)
  // Docs: "tools": [{ "google_search": {} }]
  const payload = {
    contents,
    tools: [{ google_search: {} }],
  };

  const model = typeof body?.model === "string" && body.model.trim() ? body.model.trim() : "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "Upstream fetch failed", detail: String(e?.message || e) }), {
      status: 502,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  let data: any = null;
  try {
    data = await upstream.json();
  } catch {
    // If upstream returned non-JSON
    const txt = await upstream.text().catch(() => "");
    return new Response(JSON.stringify({ error: "Upstream returned non-JSON", status: upstream.status, body: txt }), {
      status: 502,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: "Gemini API error", status: upstream.status, data }), {
      status: 502,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  const text = extractTextFromCandidates(data);

  return new Response(
    JSON.stringify({
      text,
      // Keep these so you can show citations later if you want
      groundingMetadata: data?.candidates?.[0]?.groundingMetadata ?? data?.candidates?.[0]?.grounding_metadata ?? null,
      raw: body?.debug ? data : undefined,
    }),
    {
      status: 200,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    },
  );
}
