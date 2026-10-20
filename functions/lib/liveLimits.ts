import type { KVNamespaceLike } from "../types";

/**
 * Limits for the live voice endpoint. Counters live in KV when it is bound, so
 * they hold across Cloudflare's many isolates; without KV they fall back to a
 * per-isolate map, which only blunts casual abuse.
 */

export interface LiveLimit {
  /** Short label used in the counter key. */
  name: string;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Sessions allowed per window. */
  max: number;
  /** `ip` limits are per visitor; `global` is shared by everyone. */
  scope: "ip" | "global";
}

export const LIVE_LIMITS: LiveLimit[] = [
  { name: "hour", windowSeconds: 3600, max: 4, scope: "ip" },
  { name: "day", windowSeconds: 86400, max: 8, scope: "ip" },
  { name: "all-day", windowSeconds: 86400, max: 150, scope: "global" },
];

const memory = new Map<string, { count: number; resetAt: number }>();

async function shortHash(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** How long to ask a visitor to wait when the counters cannot be trusted. */
const COUNTER_TROUBLE_RETRY_SECONDS = 5;

const memoryCount = (key: string, now: number): number => {
  const entry = memory.get(key);
  return entry && entry.resetAt > now ? entry.count : 0;
};

/**
 * Counts one session start against every limit. Returns the seconds until the
 * visitor may try again when a limit is already used up, otherwise null.
 *
 * Two layers. The in-isolate counters are checked and raised with no await in
 * between, so a burst of simultaneous requests cannot all slip through. KV adds
 * limits that hold across isolates and restarts; it is eventually consistent,
 * so it is the softer layer. If KV cannot be read or written the request is
 * refused rather than waved through.
 */
export async function takeLiveSlot(
  kv: KVNamespaceLike | undefined,
  ip: string,
  now = Date.now(),
  limits: LiveLimit[] = LIVE_LIMITS,
): Promise<number | null> {
  const who = await shortHash(ip);
  const slots = limits.map((limit) => {
    const bucket = Math.floor(now / 1000 / limit.windowSeconds);
    const resetAt = (bucket + 1) * limit.windowSeconds * 1000;
    const id = limit.scope === "global" ? "all" : who;
    return { limit, key: `ratelimit:live:${limit.name}:${id}:${bucket}`, resetAt };
  });
  const retryIn = (resetAt: number) => Math.max(1, Math.ceil((resetAt - now) / 1000));

  // Layer 1: this isolate. Check and raise together, synchronously.
  const full = slots.find(({ limit, key }) => memoryCount(key, now) >= limit.max);
  if (full) return retryIn(full.resetAt);
  for (const { key, resetAt } of slots) memory.set(key, { count: memoryCount(key, now) + 1, resetAt });
  if (memory.size > 2000) {
    for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
  }
  const giveBack = () => {
    for (const { key, resetAt } of slots) {
      const count = memoryCount(key, now);
      if (count > 0) memory.set(key, { count: count - 1, resetAt });
    }
  };

  if (!kv) return null;

  // Layer 2: KV, shared across isolates.
  try {
    const counts = await Promise.all(
      slots.map(async ({ key }) => Number.parseInt((await kv.get(key)) ?? "0", 10) || 0),
    );
    const blocked = slots.findIndex(({ limit }, i) => counts[i] >= limit.max);
    if (blocked !== -1) {
      giveBack();
      return retryIn(slots[blocked].resetAt);
    }
    await Promise.all(
      slots.map(({ key, resetAt }, i) => {
        // KV needs a TTL of at least 60 seconds.
        const ttl = Math.max(60, Math.ceil((resetAt - now) / 1000) + 60);
        return kv.put(key, String(counts[i] + 1), { expirationTtl: ttl });
      }),
    );
  } catch {
    giveBack();
    return COUNTER_TROUBLE_RETRY_SECONDS;
  }
  return null;
}

export function resetLiveLimitsForTests(): void {
  memory.clear();
}
