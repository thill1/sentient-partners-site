// functions/api/gemini.ts
// Cloudflare Pages Function:
// - GET  /api/gemini => health check (so you can open it in browser)
// - POST /api/gemini => Gemini call (API key stays in Cloudflare env)

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function onRequestGet(context: any) {
  const hasKey = Boolean(context?.env?.API_KEY || context?.env?.GEMINI_API_KEY);
  return json({
    ok: true,
    endpoint: "/api/gemini",
    hasApiKeyConfigured: hasKey,
    note: "POST to this endpoint from the app to chat.",
  });
}

export async function onRequestOptions() {
  return json({ ok: true }, 204);
}

export async function onRequestPost(context: any) {
  const apiKey = context?.env?.API_KEY || context?.env?.GEMINI_API_KEY;
  if (!apiKey) {
    return json(
      {
        error:
          "Missing API key. Add API_KEY (or GEMINI_API_KEY) in Cloudflare Pages → Settings → Variables and Secrets (Production), then redeploy.",
      },
      500,
    );
  }

  let body: any = {};
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const message = String(body?.message || "");
  const history = Array.isArray(body?.history) ? body.history : [];
  const model = String(body?.model || "gemini-2.5-flash");

  if (!message) return json({ error: "Missing `message`." }, 400);

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

  // Gives “real-time” style answers (Tokyo time, driving time, etc) via Google Search grounding.
  // If your key/model doesn’t allow this tool, remove the "tools" line and redeploy.
  const payload = {
    contents,
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.4, topP: 0.9, maxOutputTokens: 1024 },
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
    return json({ error: "Gemini error", status: upstream.status, details: data }, 500);
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p: any) => (typeof p?.text === "string" ? p.text : "")).join("");

  return json({
    text: text || "",
    groundingMetadata: data?.candidates?.[0]?.groundingMetadata || null,
  });
}
