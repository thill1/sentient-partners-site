import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  BOOKING_URL,
  CAPABILITIES_PDF,
  HEADER_ITEMS,
  RELAY,
  SOLUTIONS,
  SOLUTIONS_HUB_PATH,
  solutionPath,
} from "../../content/siteNav";
import SiteHeader from "./SiteHeader";
import { elementHtml, linksIn, textOf } from "./markupLinks";

const render = (props: { isHome: boolean; insightsLive?: boolean }) =>
  renderToStaticMarkup(<SiteHeader insightsLive {...props} />);
const desktopNav = (html: string) => elementHtml(html, /<nav class="desktop-nav"[^>]*>/);
const panel = (html: string) => elementHtml(html, /<div id="solutions-panel"[^>]*>/);
/** Top-level header labels: the Solutions button, then each link outside the panel. */
const topLevelLabels = (html: string) => {
  const nav = desktopNav(html);
  const button = textOf(elementHtml(nav, /<button[^>]*class="solutions-menu-button"[^>]*>/));
  const outsidePanel = nav.replace(panel(html), "");
  return [button, ...linksIn(outsidePanel).map((link) => link.label)];
};

describe("SiteHeader", () => {
  it("shows the items in order: Solutions, Our work, About, Insights, Free tools", () => {
    expect(topLevelLabels(render({ isHome: true }))).toEqual([
      "Solutions",
      "Our work",
      "About",
      "Insights",
      "Free tools",
    ]);
  });

  it("renders every header item from the shared nav data, in the data's order", () => {
    expect(topLevelLabels(render({ isHome: false }))).toEqual(HEADER_ITEMS.map((item) => item.label));
  });

  it("no longer has 'How we help', 'Capabilities' or 'Our founder' in the header", () => {
    const html = render({ isHome: true });
    expect(html).not.toContain("How we help");
    expect(html).not.toContain("Our founder");
    expect(topLevelLabels(html)).not.toContain("Capabilities");
  });

  it("does not add a Demos item yet", () => {
    expect(render({ isHome: true })).not.toMatch(/demos/i);
  });

  it("ends with the 20-minute intro call as the call to action", () => {
    const html = render({ isHome: true });
    const cta = linksIn(html).find((link) => link.href === BOOKING_URL);
    expect(cta?.label).toBe("Book a 20-min intro call");
    expect(html.indexOf('class="header-book"')).toBeGreaterThan(html.indexOf('class="desktop-nav"'));
  });

  it("opens Solutions from a button that controls a closed-by-default panel", () => {
    const html = render({ isHome: true });
    expect(html).toMatch(
      /<button[^>]*class="solutions-menu-button"[^>]*aria-expanded="false"[^>]*aria-controls="solutions-panel"/,
    );
    expect(html).toMatch(/<div id="solutions-panel"[^>]*hidden=""/);
  });

  it("lists every solution, then Relay, in the Solutions panel", () => {
    const links = linksIn(panel(render({ isHome: true })));
    expect(links.slice(0, SOLUTIONS.length)).toEqual(
      SOLUTIONS.map((solution) => ({ label: solution.title, href: solutionPath(solution.slug) })),
    );
    expect(links[SOLUTIONS.length].href).toBe(RELAY.path);
  });

  it("labels Relay as in pilot", () => {
    const relay = linksIn(panel(render({ isHome: true }))).find((link) => link.href === RELAY.path);
    expect(relay?.label).toMatch(/Sentient Relay/);
    expect(relay?.label).toMatch(/in pilot/i);
  });

  it("links the capabilities PDF and the solutions hub from the panel", () => {
    const links = linksIn(panel(render({ isHome: true })));
    expect(links).toContainEqual({ label: CAPABILITIES_PDF.label, href: "/capabilities.pdf" });
    expect(links.map((link) => link.href)).toContain(SOLUTIONS_HUB_PATH);
  });

  it("keeps the panel a single flat level: no nested lists, buttons or disclosures", () => {
    const panelHtml = panel(render({ isHome: true }));
    expect(panelHtml).not.toMatch(/<(button|details|summary)\b/);
    expect(panelHtml).not.toMatch(/<li[^>]*>(?:(?!<\/li>)[\s\S])*<ul/);
    expect(panelHtml).not.toContain("aria-expanded");
  });

  it("uses in-page section links on the homepage and root-relative ones elsewhere", () => {
    const hrefs = (isHome: boolean) => linksIn(desktopNav(render({ isHome }))).map((link) => link.href);
    expect(hrefs(true)).toContain("#work");
    expect(hrefs(true)).toContain("#founder");
    expect(hrefs(false)).toContain("/#work");
    expect(hrefs(false)).toContain("/#founder");
  });

  it("hides Insights when the build has no published Insights", () => {
    const html = render({ isHome: true, insightsLive: false });
    expect(topLevelLabels(html)).toEqual(["Solutions", "Our work", "About", "Free tools"]);
  });
});
