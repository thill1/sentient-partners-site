import { describe, expect, it } from "vitest";
import { analyzeHtml, fallbackSummary, normalizeTarget, scoreChecks } from "./siteCheck";

const facts = (over = {}) => ({
  finalUrl: "https://example-hvac.com/",
  status: 200,
  responseMs: 420,
  htmlBytes: 40_000,
  ...over,
});

const good = `<!doctype html><html><head>
<title>Example Heating & Air | Auburn HVAC repair</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Same-week heating and air repair in Auburn and Placer County. Upfront pricing, licensed techs.">
<meta property="og:title" content="Example Heating & Air"><meta property="og:image" content="https://x.com/og.jpg">
<script type="application/ld+json">{"@type":"HVACBusiness","telephone":"+1-530-555-0148","address":{}}</script>
<script src="https://widget.intercom.io/x.js"></script>
</head><body><h1>Comfort, fixed fast.</h1>
<a href="tel:+15305550148">(530) 555-0148</a>
<a href="https://calendly.com/example">Book online</a>
<img src="a.jpg" alt="Tech at work"></body></html>`;

describe("normalizeTarget", () => {
  it("adds https and accepts public hosts", () => {
    expect(normalizeTarget("example.com").url?.href).toBe("https://example.com/");
    expect(normalizeTarget("http://shop.example.co.uk/path#x").url?.href).toBe(
      "http://shop.example.co.uk/path",
    );
  });
  it("refuses private, local and odd targets", () => {
    for (const bad of [
      "",
      "localhost",
      "http://127.0.0.1",
      "10.0.0.5",
      "192.168.1.1",
      "172.20.0.1",
      "169.254.169.254",
      "http://[::1]/",
      "printer.local",
      "ftp://example.com",
      "https://user:pw@example.com",
      "https://example.com:8080",
    ]) {
      expect(normalizeTarget(bad).url, bad).toBeUndefined();
    }
  });
});

describe("analyzeHtml", () => {
  it("passes a well-built local business page", () => {
    const checks = analyzeHtml(good, facts());
    expect(checks.filter((c) => c.status !== "pass").map((c) => c.id)).toEqual([]);
    expect(scoreChecks(checks)).toBe(100);
  });

  it("flags the common gaps on a bare page", () => {
    const bare = `<html><head><title>Home</title></head><body><p>Call 530-555-0148</p><img src="x.jpg"></body></html>`;
    const checks = analyzeHtml(bare, facts({ finalUrl: "http://example.com/", responseMs: 2400 }));
    const status = Object.fromEntries(checks.map((c) => [c.id, c.status]));
    expect(status).toMatchObject({
      https: "fail",
      mobile: "fail",
      headline: "fail",
      call: "warn",
      book: "fail",
      local: "fail",
      "after-hours": "warn",
      speed: "fail",
      alt: "fail",
    });
    const score = scoreChecks(checks);
    expect(score).toBeLessThan(30);
    expect(fallbackSummary("example.com", checks, score)).toContain("biggest openings");
  });
});
