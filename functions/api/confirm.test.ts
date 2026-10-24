import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./confirm";
import { escapeHtml, firstName, overConfirmLimit, renderConfirmation, resetConfirmLimitsForTests } from "../lib/visitorConfirm";

const sent: Array<Record<string, unknown>> = [];

const post = (body: unknown, { origin = "https://sentientpartners.ai", ip = "203.0.113.9", env = { RESEND_API_KEY: "re_test" } as Record<string, string> } = {}) =>
  onRequestPost({
    request: new Request("https://sentientpartners.ai/api/confirm", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": ip, ...(origin ? { origin } : {}) },
      body: JSON.stringify(body),
    }),
    env,
  } as never);

beforeEach(() => {
  sent.length = 0;
  resetConfirmLimitsForTests();
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
    sent.push(JSON.parse(String(init.body)));
    return new Response("{}", { status: 200 });
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("/api/confirm", () => {
  it("sends the fixed thank-you from hello@ with reply-to hello@", async () => {
    const res = await post({ email: "Jane@Example.com", name: "Jane Doe" });
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(["jane@example.com"]);
    expect(sent[0].from).toBe("Sentient Partners <hello@sentientpartners.ai>");
    expect(sent[0].reply_to).toBe("hello@sentientpartners.ai");
    expect(String(sent[0].text)).toContain("Hi Jane,");
    expect(String(sent[0].text)).toContain("https://cal.com/sentient-partners-strategy/introductory-call");
    expect(JSON.stringify(sent[0])).not.toMatch(/troyhill/i);
  });

  it("refuses other sites and requests with no origin", async () => {
    expect((await post({ email: "a@b.co" }, { origin: "https://evil.example" })).status).toBe(403);
    expect((await post({ email: "a@b.co" }, { origin: "" })).status).toBe(403);
    expect((await post({ email: "a@b.co" }, { origin: "https://sentientpartners.ai.evil.example" })).status).toBe(403);
    expect(sent).toHaveLength(0);
  });

  it("allows preview deployments", async () => {
    await post({ email: "a@b.co" }, { origin: "https://quick-wins.sentient-partners-site.pages.dev" });
    expect(sent).toHaveLength(1);
  });

  it("does nothing for the honeypot, a bad email, or a missing key", async () => {
    await post({ email: "a@b.co", company: "spam inc" });
    await post({ email: "not-an-email" });
    await post({ email: "a@b.co" }, { env: {} });
    expect(sent).toHaveLength(0);
  });

  it("limits each recipient and each visitor to 3 an hour", async () => {
    for (let i = 0; i < 5; i += 1) await post({ email: "same@b.co" }, { ip: `198.51.100.${i}` });
    expect(sent).toHaveLength(3);
    sent.length = 0;
    for (let i = 0; i < 5; i += 1) await post({ email: `p${i}@b.co` }, { ip: "198.51.100.77" });
    expect(sent).toHaveLength(3);
  });
});

describe("confirmation content", () => {
  it("keeps only a clean first name and escapes it", () => {
    expect(firstName("  Jane Doe")).toBe("Jane");
    expect(firstName("jane@example.com")).toBe("");
    expect(firstName("<script>alert(1)</script>")).toBe("scriptalertscript");
    expect(firstName("Visit http://spam.example now")).toBe("Visit");
    expect(escapeHtml(`<a href="x">'&`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
    const { html } = renderConfirmation("O'Brien");
    expect(html).toContain("Hi O&#39;Brien,");
    expect(renderConfirmation("").text.startsWith("Hello,")).toBe(true);
  });

  it("uses the shared cache counter when available", async () => {
    const store = new Map<string, string>();
    const cache = {
      match: async (r: Request) => (store.has(r.url) ? new Response(store.get(r.url)) : undefined),
      put: async (r: Request, res: Response) => void store.set(r.url, await res.text()),
    };
    resetConfirmLimitsForTests();
    const results = [];
    for (let i = 0; i < 4; i += 1) {
      resetConfirmLimitsForTests(); // as if each request hit a new isolate
      results.push(await overConfirmLimit(["to:x@y.co"], Date.now(), cache));
    }
    expect(results).toEqual([false, false, false, true]);
  });
});
