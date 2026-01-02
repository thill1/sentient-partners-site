export const onRequestGet: PagesFunction = async (context) => {
  const hasApiKey = !!context.env.API_KEY;

  return new Response(
    JSON.stringify(
      {
        ok: true,
        hasApiKey,
        // masked preview so we can confirm it's the right key without exposing it
        apiKeyPreview: hasApiKey
          ? `${String(context.env.API_KEY).slice(0, 4)}...${String(context.env.API_KEY).slice(-4)}`
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
