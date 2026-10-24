import { allowedOrigin } from "../lib/visitorConfirm";
import { takeLiveSlot, type LiveLimit } from "../lib/liveLimits";
import { addCount, cleanLabel, dayKey, isTrackEvent } from "../lib/track";
import type { KVNamespaceLike } from "../types";

interface Env {
  SITE_SETTINGS?: KVNamespaceLike;
}

const LIMITS: LiveLimit[] = [{ name: "track-10m", windowSeconds: 600, max: 60, scope: "ip" }];
const done = (status = 204) => new Response(null, { status, headers: { "cache-control": "no-store" } });

/** POST { event, label } from navigator.sendBeacon. Always quiet: 204, 400 or 403. */
export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  if (!allowedOrigin(request)) return done(403);
  let body: { event?: unknown; label?: unknown } = {};
  try {
    body = JSON.parse((await request.text()).slice(0, 500));
  } catch {
    return done(400);
  }
  if (!isTrackEvent(body.event)) return done(400);
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if ((await takeLiveSlot(undefined, `track:${ip}`, Date.now(), LIMITS)) !== null) return done(204);
  const key = `${body.event}|${cleanLabel(body.label)}`;
  console.log("track", key);
  if (env.SITE_SETTINGS) {
    try {
      const day = dayKey();
      const next = addCount(await env.SITE_SETTINGS.get(day), key);
      await env.SITE_SETTINGS.put(day, next, { expirationTtl: 400 * 86400 });
    } catch {
      // Counting is best-effort; never fail the visitor's click.
    }
  }
  return done();
};
