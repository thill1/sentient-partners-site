import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FOOTER_COLUMNS, HEADER_CTA, HEADER_ITEMS } from "../src/content/siteNav.data.mjs";
import { TAGLINE, escapeHtml, renderSiteFooter, renderSiteHeader } from "./chrome.mjs";

const header = renderSiteHeader({ insightsLive: true });
const footer = renderSiteFooter({ insightsLive: true, year: 2026 });

describe("insights site header", () => {
  it("opens Solutions from a button that controls a closed-by-default panel", () => {
    expect(header).toMatch(/<button type="button" class="ins-solutions-button" aria-expanded="false" aria-controls="solutions-panel">/);
    expect(header).toMatch(/<div id="solutions-panel" class="ins-solutions-panel" tabindex="-1" hidden>/);
  });

  it("links Relay as in pilot and the capabilities PDF", () => {
    expect(header).toContain('<a href="/relay/">Sentient Relay (in pilot)</a>');
    expect(header).toContain('<a href="/capabilities.pdf">');
  });

  it("has a menu button for narrow screens that controls the flat mobile menu", () => {
    expect(header).toMatch(/<button type="button" class="ins-menu-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="mobile-navigation">/);
    const mobile = header.slice(header.indexOf('<nav id="mobile-navigation"'));
    expect(mobile).not.toMatch(/<(button|details|summary)\b/);
    expect(mobile).toContain("/solutions/voice-agents/");
  });

  it("uses the 20-minute intro call as the call to action", () => {
    expect(header).toContain(`<a class="ins-book" href="${HEADER_CTA.href}">Book a 20-min intro call`);
  });

  it("drops 'How we help', 'Our founder' and any Demos item from the header", () => {
    expect(header).not.toContain("How we help");
    expect(header).not.toContain("Our founder");
    expect(header).not.toMatch(/demos/i);
  });

  it("hides Insights links when the build has none published", () => {
    const quiet = renderSiteHeader({ insightsLive: false });
    expect(quiet).not.toContain('href="/insights/"');
    expect(header.match(/href="\/insights\/"/g)).toHaveLength(2);
    expect(HEADER_ITEMS.some((item) => item.requiresInsights)).toBe(true);
  });
});

describe("insights site footer", () => {
  it("has the four columns from the shared nav data", () => {
    const headings = [...footer.matchAll(/<h2>([^<]*)<\/h2>/g)].map(([, heading]) => heading);
    expect(headings).toEqual(FOOTER_COLUMNS.map((column) => escapeHtml(column.heading)));
    expect(headings).toHaveLength(4);
  });

  it("keeps the tagline exactly as written and the given year", () => {
    expect(TAGLINE).toBe("Business Strategy. Intelligent Systems. Measurable Results.");
    expect(footer).toContain(`<p class="ins-footer-tagline">${TAGLINE}</p>`);
    expect(footer).toContain("© 2026 Sentient Partners.");
  });

  it("leaves out in-app actions that have no link on a static page", () => {
    expect(footer).not.toContain("Ask Sentient");
    expect(footer).not.toContain('href="undefined"');
  });

  it("uses hello@ only and opens LinkedIn in a new tab", () => {
    expect(footer).toContain('href="mailto:hello@sentientpartners.ai"');
    expect(footer).not.toContain("troyhill@");
    expect(footer).toMatch(/<a href="https:\/\/www\.linkedin\.com\/[^"]*" target="_blank" rel="noopener noreferrer">LinkedIn<\/a>/);
  });
});

describe("insights chrome wiring", () => {
  it("escapes text placed into HTML", () => {
    expect(escapeHtml(`Calendar & "scheduling" <b>`)).toBe("Calendar &amp; &quot;scheduling&quot; &lt;b&gt;");
  });

  it("build.mjs renders the shared header and footer and ships nav.js", () => {
    const build = readFileSync("insights/build.mjs", "utf8");
    expect(build).toContain("${SITE_HEADER}");
    expect(build).toContain("${SITE_FOOTER}");
    expect(build).toContain('<script src="/insights/nav.js" defer></script>');
    expect(build).toMatch(/for \(const f of \[[^\]]*"nav\.js"[^\]]*\]\) copyFileSync/);
    expect(build).not.toContain('<a href="/#capabilities">');
  });
});
