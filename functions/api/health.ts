export const onRequestGet: PagesFunction = async (context) => {
  const key = context.env.API_KEY || context.env.GEMINI_API_KEY;
  const hasApiKey = !!key;

  return new Response(
    JSON.stringify(
      {
        ok: true,
        hasApiKey,
        // masked preview so we can confirm it's the right key without exposing it
        apiKeyPreview: hasApiKey
          ? `${String(key).slice(0, 4)}...${String(key).slice(-4)}`
          : null,
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  );
};
