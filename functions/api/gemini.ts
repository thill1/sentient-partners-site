export async function onRequestPost(context: any) {
  try {
    const { request, env } = context;

    const apiKey = env.GEMINI_API_KEY || env.API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Missing GEMINI_API_KEY (or API_KEY) in Cloudflare Pages environment variables.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const model = body.model || "gemini-2.5-flash";

    // Accept either:
    // 1) { prompt: "..." }
    // 2) { contents: [...] } (full payload)
    const payload =
      typeof body.prompt === "string"
        ? { contents: [{ role: "user", parts: [{ text: body.prompt }] }] }
        : {
            contents: body.contents,
            systemInstruction: body.systemInstruction,
            tools: body.tools,
            toolConfig: body.toolConfig,
            generationConfig: body.generationConfig,
            safetySettings: body.safetySettings,
          };

    if (!payload.contents) {
      return new Response(
        JSON.stringify({
          error: "Bad request. Provide either {prompt:string} or {contents:[...]}",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "Gemini proxy failure",
        detail: err?.message || String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
