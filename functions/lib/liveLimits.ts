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

/**
 * Counts one session start against every limit. Returns the seconds until the
 * visitor may try again when a limit is already used up, otherwise null.
 * A refused start is not counted.
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

  const counts = await Promise.all(
    slots.map(async ({ key }) => {
      if (kv) {
        const stored = await kv.get(key).catch(() => null);
        return Number.parseInt(stored ?? "0", 10) || 0;
      }
      const entry = memory.get(key);
      return entry && entry.resetAt > now ? entry.count : 0;
    }),
  );

  const blocked = slots.findIndex(({ limit }, i) => counts[i] >= limit.max);
  if (blocked !== -1) {
    return Math.max(1, Math.ceil((slots[blocked].resetAt - now) / 1000));
  }

  await Promise.all(
    slots.map(async ({ key, resetAt }, i) => {
      const count = counts[i] + 1;
      if (kv) {
        // KV needs a TTL of at least 60 seconds.
        const ttl = Math.max(60, Math.ceil((resetAt - now) / 1000) + 60);
        await kv.put(key, String(count), { expirationTtl: ttl }).catch(() => undefined);
      } else {
        memory.set(key, { count, resetAt });
        if (memory.size > 2000) {
          for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
        }
      }
    }),
  );
  return null;
}

export function resetLiveLimitsForTests(): void {
  memory.clear();
}
