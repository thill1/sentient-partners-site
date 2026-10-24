import { describe, expect, it } from "vitest";
import { onRequestPost } from "./track";
import { addCount, cleanLabel, dayKey } from "../lib/track";

const kv = () => {
  const m = new Map<string, string>();
  return { m, get: async (k: string) => m.get(k) ?? null, put: async (k: string, v: string) => void m.set(k, v) };
};
const post = (body: unknown, env: object, origin = "https://sentientpartners.ai", ip = "192.0.2.1") =>
  onRequestPost({
    request: new Request("https://sentientpartners.ai/api/track", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": ip, ...(origin ? { origin } : {}) },
      body: JSON.stringify(body),
    }),
    env,
  } as never);

describe("/api/track", () => {
  it("counts a known event per day without storing who clicked", async () => {
    const store = kv();
    expect((await post({ event: "book_call", label: "Action dock" }, { SITE_SETTINGS: store })).status).toBe(204);
    await post({ event: "book_call", label: "Action dock" }, { SITE_SETTINGS: store }, undefined, "192.0.2.2");
    const saved = store.m.get(dayKey())!;
    expect(JSON.parse(saved)).toEqual({ "book_call|action-dock": 2 });
    expect(saved).not.toContain("192.0.2");
  });
  it("rejects unknown events and other sites", async () => {
    const store = kv();
    expect((await post({ event: "anything" }, { SITE_SETTINGS: store })).status).toBe(400);
    expect((await post({ event: "phone" }, { SITE_SETTINGS: store }, "https://evil.example")).status).toBe(403);
    expect((await post({ event: "phone" }, { SITE_SETTINGS: store }, "")).status).toBe(403);
    expect(store.m.size).toBe(0);
  });
  it("works with no storage bound", async () => {
    expect((await post({ event: "phone", label: "dock" }, {}, undefined, "192.0.2.9")).status).toBe(204);
  });
  it("keeps labels short and safe", () => {
    expect(cleanLabel("Hello <b>World</b>!")).toMatch(/^[a-z0-9._/-]+$/);
    expect(cleanLabel("x".repeat(200)).length).toBe(60);
    expect(JSON.parse(addCount("not json", "a|b"))).toEqual({ "a|b": 1 });
  });
});
