import { beforeEach, describe, expect, it } from "vitest";
import { LIVE_LIMITS, resetLiveLimitsForTests, takeLiveSlot } from "./liveLimits";
import type { KVNamespaceLike } from "../types";

beforeEach(() => resetLiveLimitsForTests());

const NOW = Date.UTC(2026, 9, 19, 12, 0, 0);

/** A KV that answers slowly and always reports an empty counter, like a racing read. */
const staleKv = (): KVNamespaceLike => ({
  get: async () => {
    await new Promise((r) => setTimeout(r, 5));
    return null;
  },
  put: async () => undefined,
});

describe("takeLiveSlot", () => {
  it("lets exactly the allowed number through when requests arrive together", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => takeLiveSlot(undefined, "198.51.100.1", NOW)));
    expect(results.filter((r) => r === null)).toHaveLength(4);
  });

  it("still holds a burst when KV hands every request the same stale count", async () => {
    const kv = staleKv();
    const results = await Promise.all(Array.from({ length: 20 }, () => takeLiveSlot(kv, "198.51.100.2", NOW)));
    expect(results.filter((r) => r === null)).toHaveLength(4);
  });

  it("applies the sitewide cap across visitors", async () => {
    const tight = [{ name: "all", windowSeconds: 3600, max: 3, scope: "global" as const }];
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => takeLiveSlot(undefined, `203.0.113.${i}`, NOW, tight)),
    );
    expect(results.filter((r) => r === null)).toHaveLength(3);
  });

  it("refuses rather than waves through when KV cannot be written", async () => {
    const broken: KVNamespaceLike = {
      get: async () => null,
      put: async () => {
        throw new Error("KV put failed: 429");
      },
    };
    expect(await takeLiveSlot(broken, "198.51.100.3", NOW)).toBeGreaterThan(0);
  });

  it("refuses when KV cannot be read", async () => {
    const broken: KVNamespaceLike = {
      get: async () => {
        throw new Error("KV get failed");
      },
      put: async () => undefined,
    };
    expect(await takeLiveSlot(broken, "198.51.100.4", NOW)).toBeGreaterThan(0);
  });

  it("does not use up a visitor's allowance on a refused start", async () => {
    const broken: KVNamespaceLike = {
      get: async () => null,
      put: async () => {
        throw new Error("boom");
      },
    };
    for (let i = 0; i < 10; i += 1) await takeLiveSlot(broken, "198.51.100.5", NOW);
    // Once KV recovers the visitor still has their full allowance.
    const results = await Promise.all(Array.from({ length: 6 }, () => takeLiveSlot(undefined, "198.51.100.5", NOW)));
    expect(results.filter((r) => r === null)).toHaveLength(4);
  });

  it("honours counts already held in KV (limits that survive other isolates)", async () => {
    const store = new Map<string, string>();
    const kv: KVNamespaceLike = {
      get: async (k) => store.get(k) ?? null,
      put: async (k, v) => void store.set(k, v),
    };
    for (let i = 0; i < 4; i += 1) expect(await takeLiveSlot(kv, "198.51.100.6", NOW)).toBeNull();
    resetLiveLimitsForTests(); // a different isolate has no memory of them
    expect(await takeLiveSlot(kv, "198.51.100.6", NOW)).toBeGreaterThan(0);
  });

  it("resets when the window rolls over", async () => {
    for (let i = 0; i < 4; i += 1) await takeLiveSlot(undefined, "198.51.100.7", NOW);
    expect(await takeLiveSlot(undefined, "198.51.100.7", NOW)).toBeGreaterThan(0);
    const hourLater = NOW + 3600 * 1000 + 1000;
    expect(await takeLiveSlot(undefined, "198.51.100.7", hourLater)).toBeNull();
  });

  it("ships the limits the README describes", () => {
    expect(LIVE_LIMITS.map((l) => `${l.scope}:${l.name}:${l.max}`)).toEqual(["ip:hour:4", "ip:day:8", "global:all-day:150"]);
  });
});
