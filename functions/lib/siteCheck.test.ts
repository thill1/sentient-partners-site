import { describe, expect, it } from "vitest";
import {
  analyzeHtml,
  analyzeSecurity,
  fallbackSummary,
  normalizeTarget,
  phpVerdict,
  scoreChecks,
} from "./siteCheck";

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

describe("phpVerdict", () => {
  it("knows the PHP2Shell fix releases", () => {
    expect(phpVerdict("8.3.36")).toBe("patched");
    expect(phpVerdict("8.4.30")).toBe("patched");
    expect(phpVerdict("8.3.35")).toBe("unpatched");
    expect(phpVerdict("8.5.11")).toBe("unpatched");
    expect(phpVerdict("8.1.31")).toBe("eol");
    expect(phpVerdict("7.4.33")).toBe("eol");
    expect(phpVerdict("8.3")).toBe("unknown");
    expect(phpVerdict("9.0.1")).toBe("unknown");
  });
});

describe("analyzeSecurity", () => {
  const byId = (checks: ReturnType<typeof analyzeSecurity>) =>
    Object.fromEntries(checks.map((c) => [c.id, c]));

  it("flags an old PHP version and leaky headers", () => {
    const headers = new Headers({ "x-powered-by": "PHP/7.4.33", server: "Apache/2.4.41 (Ubuntu)" });
    const html = '<meta name="generator" content="WordPress 6.4.2"><link href="/wp-content/x.css">';
    const checks = byId(analyzeSecurity(headers, html, "https://example.com/"));
    expect(checks.php.status).toBe("fail");
    expect(checks.php.detail).toMatch(/no longer gets security fixes/);
    expect(checks["cms-version"].status).toBe("warn");
    expect(checks["server-version"].status).toBe("warn");
    expect(checks.hsts.status).toBe("warn");
    expect(checks.headers.status).toBe("fail");
    expect(Object.values(checks).every((c) => c.group === "security")).toBe(true);
  });

  it("asks for host confirmation when PHP is likely but the version is hidden", () => {
    const html = '<link href="/wp-content/themes/x/style.css">';
    const checks = byId(analyzeSecurity(new Headers(), html, "https://example.com/"));
    expect(checks.php.status).toBe("warn");
    expect(checks.php.detail).toMatch(/WordPress/);
    expect(checks.php.detail).toMatch(/CVE-2026-109618/);
  });

  it("passes a hardened static site", () => {
    const headers = new Headers({
      "strict-transport-security": "max-age=31536000",
      "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      server: "cloudflare",
    });
    const checks = byId(analyzeSecurity(headers, "<h1>Hi</h1>", "https://example.com/"));
    expect(checks.php.status).toBe("pass");
    expect(checks.hsts.status).toBe("pass");
    expect(checks.headers.status).toBe("pass");
    expect(checks["server-version"]).toBeUndefined();
  });

  it("keeps security checks out of the score", () => {
    const basics = analyzeHtml(good, facts());
    const security = analyzeSecurity(new Headers({ "x-powered-by": "PHP/7.4.1" }), good, "https://x.com/");
    expect(scoreChecks([...basics, ...security])).toBe(scoreChecks(basics));
  });
});
