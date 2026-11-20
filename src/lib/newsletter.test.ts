import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildGhlSignup,
  buildSignup,
  ghlWebhookReady,
  NEWSLETTER_CONFIG_URL,
  NEWSLETTER_ENDPOINT,
  resetNewsletterConfigCache,
  subscribe,
} from "./newsletter";

afterEach(() => {
  vi.restoreAllMocks();
  resetNewsletterConfigCache();
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("ghlWebhookReady", () => {
  it("rejects placeholder URLs", () => {
    expect(
      ghlWebhookReady({
        provider: "ghl-webhook",
        ghlWebhookUrl: "https://services.leadconnectorhq.com/hooks/REPLACE_WITH_GHL_INBOUND_WEBHOOK",
      }),
    ).toBe(false);
  });
  it("accepts a real webhook URL", () => {
    expect(
      ghlWebhookReady({
        provider: "ghl-webhook",
        ghlWebhookUrl: "https://services.leadconnectorhq.com/hooks/abc123",
      }),
    ).toBe(true);
  });
});

describe("newsletter subscribe", () => {
  it("posts the signup to hello@ via FormSubmit when GHL URL is still a placeholder", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockImplementation((url, init) => {
      if (url === NEWSLETTER_CONFIG_URL) {
        return Promise.resolve(
          json({
            provider: "ghl-webhook",
            ghlWebhookUrl: "https://services.leadconnectorhq.com/hooks/REPLACE_WITH_GHL_INBOUND_WEBHOOK",
          }),
        );
      }
      return Promise.resolve(json({ success: "true" }));
    });
    expect(await subscribe("a@b.co")).toBe(true);
    expect(f.mock.calls.some(([u]) => u === NEWSLETTER_ENDPOINT)).toBe(true);
    const post = f.mock.calls.find(([u]) => u === NEWSLETTER_ENDPOINT);
    expect(JSON.parse(String((post![1] as RequestInit).body))).toMatchObject(buildSignup("a@b.co"));
    expect(buildSignup("a@b.co")._subject).toBe("Newsletter signup - a@b.co");
  });

  it("posts to GHL inbound webhook when URL is configured", async () => {
    const hook = "https://services.leadconnectorhq.com/hooks/live-webhook-id";
    const f = vi.spyOn(globalThis, "fetch").mockImplementation((url, init) => {
      if (url === NEWSLETTER_CONFIG_URL) {
        return Promise.resolve(json({ provider: "ghl-webhook", ghlWebhookUrl: hook }));
      }
      return Promise.resolve(new Response(null, { status: 200 }));
    });
    expect(await subscribe("a@b.co")).toBe(true);
    expect(f.mock.calls.some(([u]) => u === hook)).toBe(true);
    const post = f.mock.calls.find(([u]) => u === hook);
    expect(JSON.parse(String((post![1] as RequestInit).body))).toEqual(buildGhlSignup("a@b.co"));
  });

  it("fails on FormSubmit success 'false', HTTP errors and network errors", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      if (url === NEWSLETTER_CONFIG_URL) return Promise.resolve(json({ provider: "formsubmit", ghlWebhookUrl: "" }));
      return Promise.resolve(json({ success: "false" }));
    });
    expect(await subscribe("a@b.co")).toBe(false);
    vi.restoreAllMocks();
    resetNewsletterConfigCache();
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      if (url === NEWSLETTER_CONFIG_URL) return Promise.resolve(json({ provider: "formsubmit", ghlWebhookUrl: "" }));
      return Promise.resolve(json({ success: "true" }, 500));
    });
    expect(await subscribe("a@b.co")).toBe(false);
    vi.restoreAllMocks();
    resetNewsletterConfigCache();
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      if (url === NEWSLETTER_CONFIG_URL) return Promise.resolve(json({ provider: "formsubmit", ghlWebhookUrl: "" }));
      return Promise.reject(new Error("x"));
    });
    expect(await subscribe("a@b.co")).toBe(false);
  });

  it("treats honeypot fills as success without posting", async () => {
    const f = vi.spyOn(globalThis, "fetch");
    expect(await subscribe("a@b.co", "bot")).toBe(true);
    expect(f).not.toHaveBeenCalled();
  });
});