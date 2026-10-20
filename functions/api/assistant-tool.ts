import { runTool, type AssistantEnv } from "../lib/assistantTools";

/**
 * Runs one assistant action for the live voice session, which talks to Google
 * directly from the browser and so needs the server to act on its behalf.
 * Text chat runs the same tools inside /api/gemini.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const sameOrigin = (request: Request): boolean => {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
};

export const onRequestPost: PagesFunction<AssistantEnv> = async ({ request, env }) => {
  if (!sameOrigin(request)) return json({ error: "Not allowed." }, 403);
  let body: { name?: unknown; args?: unknown; timeZone?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "Send JSON { name, args, timeZone }." }, 400);
  }
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const outcome = await runTool(body.name, body.args, env, { ip, timeZone: String(body.timeZone ?? "") });
  return json(outcome);
};
