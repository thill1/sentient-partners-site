import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BOOKING_URL, FOOTER_COLUMNS, RELAY, SOLUTIONS, solutionPath } from "../../content/siteNav";
import SiteFooter from "./SiteFooter";
import { elementHtml, linksIn, textOf } from "./markupLinks";

const render = (props: { isHome: boolean; insightsLive?: boolean }) =>
  renderToStaticMarkup(<SiteFooter insightsLive {...props} />);
const column = (html: string, id: string) =>
  elementHtml(html, new RegExp(`<div class="footer-column footer-column-${id}"[^>]*>`));
const headings = (html: string) =>
  [...html.matchAll(/<div class="footer-column[^>]*><span>([\s\S]*?)<\/span>/g)].map(([, heading]) => textOf(heading));

describe("SiteFooter", () => {
  it("has four columns: Solutions, Company, Free tools and contact", () => {
    const html = render({ isHome: true });
    expect(headings(html)).toEqual(["Solutions", "Company", "Free tools", "Let's connect"]);
    expect(headings(html)).toEqual(FOOTER_COLUMNS.map((footerColumn) => footerColumn.heading));
  });

  it("lists every solution and Relay (in pilot) under Solutions", () => {
    const links = linksIn(column(render({ isHome: true }), "solutions"));
    for (const solution of SOLUTIONS) {
      expect(links).toContainEqual({ label: solution.title, href: solutionPath(solution.slug) });
    }
    expect(links.find((link) => link.href === RELAY.path)?.label).toMatch(/in pilot/i);
  });

  it("puts the website check first under Free tools and links the capabilities PDF", () => {
    const links = linksIn(column(render({ isHome: true }), "tools"));
    expect(links[0]).toEqual({ label: "Website check", href: "/tools/website-check/" });
    expect(links.map((link) => link.href)).toContain("/capabilities.pdf");
  });

  it("renames 'Our founder' to About and keeps 'How we help' under Company", () => {
    const html = render({ isHome: false });
    const labels = linksIn(column(html, "company")).map((link) => link.label);
    expect(labels).toEqual(["How we help", "Our work", "About", "Our approach", "Insights"]);
    expect(html).not.toContain("Our founder");
  });

  it("offers the 20-minute intro call, Ask Sentient and hello@ only under contact", () => {
    const html = render({ isHome: true });
    const contact = column(html, "contact");
    expect(linksIn(contact)).toContainEqual({ label: "Book a 20-minute intro call", href: BOOKING_URL });
    expect(contact).toMatch(/<button[^>]*>Ask Sentient \(chat or voice\)<\/button>/);
    expect(linksIn(contact).map((link) => link.href)).toContain("mailto:hello@sentientpartners.ai");
    expect(html).not.toContain("troyhill@");
  });

  it("keeps the tagline exactly as written and the legal links", () => {
    const html = render({ isHome: true });
    expect(html).toContain("Business Strategy. Intelligent Systems. Measurable Results.");
    expect(linksIn(elementHtml(html, /<span class="footer-legal"[^>]*>/))).toEqual([
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ]);
  });

  it("uses in-page section links on the homepage and root-relative ones elsewhere", () => {
    const hrefs = (isHome: boolean) => linksIn(column(render({ isHome }), "company")).map((link) => link.href);
    expect(hrefs(true)).toContain("#services");
    expect(hrefs(false)).toContain("/#services");
  });

  it("hides Insights when the build has no published Insights", () => {
    const labels = linksIn(column(render({ isHome: true, insightsLive: false }), "company")).map((link) => link.label);
    expect(labels).not.toContain("Insights");
  });
});
