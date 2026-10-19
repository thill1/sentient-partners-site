import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./email-report";

const report = {
  host: "example-hvac.com",
  score: 72,
  summary: "Solid start. Add a booking link.",
  checks: [{ label: "Tap to call", status: "pass", detail: "A phone link is on the page." }],
};

const post = (body: unknown, env: Record<string, string> = { RESEND_API_KEY: "re_test" }, ip = "198.51.100.1") =>
  onRequestPost({
    request: new Request("https://sentientpartners.ai/api/email-report", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": ip },
      body: JSON.stringify(body),
    }),
    env,
  });

afterEach(() => vi.unstubAllGlobals());

describe("/api/email-report", () => {
  it("answers 501 without a mail key so the page can fall back", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await post({ email: "a@b.co", report }, {}, "198.51.100.2");
    expect(res.status).toBe(501);
    expect(((await res.json()) as { configured: boolean }).configured).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("emails the report to the requester only", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await post({ email: "Owner@Example.com", report }, undefined, "198.51.100.3");
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const sent = JSON.parse(String(init.body));
    expect(sent.to).toEqual(["owner@example.com"]);
    expect(sent.subject).toContain("example-hvac.com");
    expect(sent.text).toContain("72/100");
  });

  it("escapes report text in the HTML body", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const evil = { ...report, summary: "<script>alert(1)</script>" };
    await post({ email: "x@y.co", report: evil }, undefined, "198.51.100.4");
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).html).not.toContain("<script>");
  });

  it("rejects bad addresses and private hosts without sending", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await post({ email: "nope", report }, undefined, "198.51.100.5")).status).toBe(400);
    const priv = { ...report, host: "localhost" };
    expect((await post({ email: "a@b.co", report: priv }, undefined, "198.51.100.6")).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a provider failure instead of success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 403 })));
    const res = await post({ email: "q@r.co", report }, undefined, "198.51.100.7");
    expect(res.status).toBe(502);
  });
});
