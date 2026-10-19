import { GoogleGenAI } from "@google/genai";
import type { Env } from "../types";
import { getSiteSettings } from "../lib/siteSettings";
import { takeLiveSlot } from "../lib/liveLimits";
import {
  buildLiveSessionConfig,
  toBrowserConfig,
  DEFAULT_LIVE_API_VERSION,
  DEFAULT_LIVE_MODEL,
  LIVE_MAX_SECONDS,
  LIVE_START_WINDOW_SECONDS,
  LIVE_TOKEN_GRACE_SECONDS,
} from "../lib/liveSession";

/**
 * Starts a live voice conversation. The browser never sees the Google key: it
 * gets a single-use token that expires right after the time cap and is tied to
 * the model, so a copied token cannot run a long or different session.
 */

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
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

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!sameOrigin(request)) return json({ error: "Not allowed." }, 403);

  const apiKey = String(env?.GEMINI_LIVE_API_KEY || env?.GEMINI_API_KEY || "").trim();
  if (!apiKey) return json({ configured: false, error: "Live voice is not set up." }, 501);

  const settings = await getSiteSettings(env);
  if (!settings.ai.voiceEnabled) return json({ error: "Voice is turned off." }, 403);

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const retryAfter = await takeLiveSlot(env.SITE_SETTINGS, ip);
  if (retryAfter !== null) {
    return json(
      { error: "Voice is busy right now. Please try again a little later.", retryAfter },
      429,
      { "retry-after": String(retryAfter) },
    );
  }

  const model = String(env.GEMINI_LIVE_MODEL || DEFAULT_LIVE_MODEL).trim();
  const apiVersion = String(env.GEMINI_LIVE_API_VERSION || DEFAULT_LIVE_API_VERSION).trim();
  const config = buildLiveSessionConfig(String(env.SENTIENT_SITE_MEMORY || ""));

  try {
    const client = new GoogleGenAI({ apiKey, httpOptions: { apiVersion } });
    const now = Date.now();
    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(now + (LIVE_MAX_SECONDS + LIVE_TOKEN_GRACE_SECONDS) * 1000).toISOString(),
        newSessionExpireTime: new Date(now + LIVE_START_WINDOW_SECONDS * 1000).toISOString(),
        liveConnectConstraints: { model, config },
      },
    });
    if (!token?.name) return json({ error: "Could not start voice." }, 502);
    return json({ token: token.name, model, apiVersion, config: toBrowserConfig(config), maxSeconds: LIVE_MAX_SECONDS });
  } catch (error) {
    console.error("live-token failed", error instanceof Error ? error.message : error);
    return json({ error: "Could not start voice." }, 502);
  }
};

export const onRequest: PagesFunction<Env> = async () => json({ error: "POST only." }, 405, { allow: "POST" });
