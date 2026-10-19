import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./site-check";

const page = `<html><head><title>Example Heating & Air | Auburn HVAC</title>
<meta name="viewport" content="width=device-width"></head>
<body><h1>Comfort, fixed fast.</h1><a href="tel:+15305550148">Call</a></body></html>`;

const post = (body: unknown, ip = "203.0.113.9") =>
  onRequestPost({
    request: new Request("https://sentientpartners.ai/api/site-check", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": ip },
      body: JSON.stringify(body),
    }),
    env: {},
  });

afterEach(() => vi.unstubAllGlobals());

describe("/api/site-check", () => {
  it("grades a public page without an AI key", async () => {
    const fetchMock = vi.fn(async () => {
      const r = new Response(page, { headers: { "content-type": "text/html; charset=utf-8" } });
      Object.defineProperty(r, "url", { value: "https://example-hvac.com/" });
      return r;
    });
    vi.stubGlobal("fetch", fetchMock);
    const res = await post({ url: "example-hvac.com" }, "203.0.113.1");
    const data = (await res.json()) as { ok: boolean; score: number; checks: { id: string }[]; summary: string; ai: boolean };
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.ai).toBe(false);
    expect(data.checks.map((c) => c.id)).toContain("call");
    expect(data.score).toBeGreaterThan(0);
    expect(data.summary).toContain("example-hvac.com");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("refuses private targets without fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await post({ url: "http://169.254.169.254/latest" }, "203.0.113.2");
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses redirects that land on a private host", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      const r = new Response(page, { headers: { "content-type": "text/html" } });
      Object.defineProperty(r, "url", { value: "http://127.0.0.1/admin" });
      return r;
    }));
    const res = await post({ url: "example.com" }, "203.0.113.3");
    expect(res.status).toBe(400);
  });

  it("rate-limits bursts from one address", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(page, { headers: { "content-type": "text/html" } })));
    let last = 0;
    for (let i = 0; i < 8; i++) last = (await post({ url: "example.com" }, "203.0.113.4")).status;
    expect(last).toBe(429);
  });
});
