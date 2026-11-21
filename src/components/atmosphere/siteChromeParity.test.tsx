import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderSiteFooter, renderSiteHeader } from "../../../insights/chrome.mjs";
import { FOOTER_COLUMNS } from "../../content/siteNav";
import MobileMenu from "./MobileMenu";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { elementHtml, linksIn, textOf, type MarkupLink } from "./markupLinks";

/**
 * The Insights pages are static HTML built by insights/build.mjs, not React.
 * These tests hold their header and footer to the React ones, link for link.
 * Insights is never the homepage, so React is rendered with isHome={false}.
 */
interface HeaderShape {
  solutionsButton: string;
  topLevelLinks: MarkupLink[];
  panelLinks: MarkupLink[];
  callToAction: MarkupLink;
}

function headerShape(html: string, selectors: { nav: RegExp; button: RegExp; panel: RegExp; book: RegExp }): HeaderShape {
  const nav = elementHtml(html, selectors.nav);
  const panel = elementHtml(nav, selectors.panel);
  const book = selectors.book.exec(html);
  if (!book) throw new Error(`siteChromeParity: no booking link matching ${selectors.book}`);
  return {
    solutionsButton: textOf(elementHtml(nav, selectors.button)).replace(/\s*▾$/, ""),
    topLevelLinks: linksIn(nav.replace(panel, "")),
    panelLinks: linksIn(panel),
    callToAction: {
      ...linksIn(book[0])[0],
      label: linksIn(book[0])[0].label.replace(/\s*→$/, ""),
    },
  };
}

const reactHeader = (insightsLive: boolean) =>
  headerShape(renderToStaticMarkup(<SiteHeader isHome={false} insightsLive={insightsLive} />), {
    nav: /<nav class="desktop-nav"[^>]*>/,
    button: /<button[^>]*class="solutions-menu-button"[^>]*>/,
    panel: /<div id="solutions-panel"[^>]*>/,
    book: /<a class="header-book"[^>]*>[\s\S]*?<\/a>/,
  });
const insightsHeader = (insightsLive: boolean) =>
  headerShape(renderSiteHeader({ insightsLive }), {
    nav: /<nav class="ins-nav"[^>]*>/,
    button: /<button[^>]*class="ins-solutions-button"[^>]*>/,
    panel: /<div id="solutions-panel"[^>]*>/,
    book: /<a class="ins-book"[^>]*>[\s\S]*?<\/a>/,
  });

const reactMobileLinks = (insightsLive: boolean) =>
  linksIn(
    renderToStaticMarkup(
      <MobileMenu isHome={false} insightsLive={insightsLive} onNavigate={() => undefined} onBook={() => undefined} />,
    ),
  );
const insightsMobileLinks = (insightsLive: boolean) =>
  linksIn(elementHtml(renderSiteHeader({ insightsLive }), /<nav id="mobile-navigation"[^>]*>/));

describe("Insights header matches the React header", () => {
  for (const insightsLive of [true, false]) {
    const when = insightsLive ? "with Insights published" : "with no Insights published";

    it(`desktop: same Solutions button, items, panel and call to action (${when})`, () => {
      expect(insightsHeader(insightsLive)).toEqual(reactHeader(insightsLive));
    });

    it(`mobile: the same flat list of links in the same order (${when})`, () => {
      expect(insightsMobileLinks(insightsLive)).toEqual(reactMobileLinks(insightsLive));
    });
  }

  it("the comparison is not vacuous: both headers list the solutions panel and five items", () => {
    const shape = reactHeader(true);
    expect([shape.solutionsButton, ...shape.topLevelLinks.map((link) => link.label)]).toEqual([
      "Solutions",
      "Our work",
      "About",
      "Insights",
      "Free tools",
    ]);
    expect(shape.panelLinks.length).toBeGreaterThan(10);
    expect(reactMobileLinks(true).length).toBeGreaterThan(15);
  });
});

describe("Insights footer matches the React footer", () => {
  const reactFooter = (insightsLive: boolean) =>
    renderToStaticMarkup(<SiteFooter isHome={false} insightsLive={insightsLive} />);

  for (const insightsLive of [true, false]) {
    const when = insightsLive ? "with Insights published" : "with no Insights published";

    it(`same columns, headings and links (${when})`, () => {
      const react = reactFooter(insightsLive);
      const insights = renderSiteFooter({ insightsLive, year: 2026 });
      for (const column of FOOTER_COLUMNS) {
        const reactColumn = elementHtml(react, new RegExp(`<div class="footer-column footer-column-${column.id}"[^>]*>`));
        const insightsColumn = elementHtml(insights, new RegExp(`<div class="ins-footer-column ins-footer-column-${column.id}"[^>]*>`));
        expect(textOf(elementHtml(insightsColumn, /<h2[^>]*>/))).toBe(textOf(elementHtml(reactColumn, /<span[^>]*>/)));
        // React also shows "Ask Sentient", an in-app button with no link; static pages leave it out.
        expect(linksIn(insightsColumn)).toEqual(linksIn(reactColumn));
        expect(linksIn(insightsColumn).length).toBeGreaterThan(0);
      }
    });
  }

  it("same legal links and tagline", () => {
    const react = reactFooter(true);
    const insights = renderSiteFooter({ insightsLive: true, year: 2026 });
    expect(linksIn(elementHtml(insights, /<nav class="ins-footer-legal"[^>]*>/))).toEqual(
      linksIn(elementHtml(react, /<span class="footer-legal"[^>]*>/)),
    );
    expect(textOf(elementHtml(insights, /<p class="ins-footer-tagline"[^>]*>/))).toBe(
      textOf(elementHtml(react, /<p class="footer-tagline"[^>]*>/)),
    );
  });
});
