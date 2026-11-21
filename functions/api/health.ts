// Public liveness only. Do not report which secrets, passwords, or bindings are configured.

export const onRequestGet: PagesFunction = async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      route: "/api/health",
      time: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  );
};
