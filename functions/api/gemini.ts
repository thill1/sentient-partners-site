// functions/api/gemini.ts
// Cloudflare Pages Function: POST /api/gemini
// Uses env.API_KEY (server-side) + enables Google Search grounding for real-time answers.

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = env?.API_KEY || env?.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          "Missing API_KEY (or GEMINI_API_KEY) in Cloudflare Pages → Settings → Variables and Secrets (Production).",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const message = String(body?.message || "");
  const history = Array.isArray(body?.history) ? body.history : [];
  const model = String(body?.model || "gemini-2.5-flash");

  if (!message) {
    return new Response(JSON.stringify({ error: "Missing `message`." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contents = [
    ...history
      .filter((h: any) => h && typeof h.text === "string")
      .map((h: any) => ({
        role: h.role === "model" ? "model" : "user",
        parts: [{ text: h.text }],
      })),
    { role: "user", parts: [{ text: message }] },
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent`;

  const payload = {
    contents,
    tools: [{ google_search: {} }], // ✅ real-time web grounding
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 1024,
    },
  };

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await upstream.json().catch(() => ({} as any));

  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: "Gemini error", details: data }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p: any) => (typeof p?.text === "string" ? p.text : "")).join("");

  return new Response(
    JSON.stringify({
      text: text || "",
      groundingMetadata: data?.candidates?.[0]?.groundingMetadata || null,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
