import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CAPABILITIES_PDF, CONTACT, RELAY, SOLUTIONS, solutionPath } from "../../content/siteNav";
import MobileMenu from "./MobileMenu";
import { linksIn } from "./markupLinks";

const render = (insightsLive = true) =>
  renderToStaticMarkup(
    <MobileMenu isHome={false} insightsLive={insightsLive} onNavigate={() => undefined} onBook={() => undefined} />,
  );

describe("MobileMenu", () => {
  it("is one flat, always-open list: nothing to expand or collapse", () => {
    const html = render();
    expect(html).not.toMatch(/<(button|details|summary)\b/);
    expect(html).not.toContain("aria-expanded");
    expect(html).not.toMatch(/\shidden(=|\s|>)/);
    expect(html).not.toMatch(/<li[^>]*>(?:(?!<\/li>)[\s\S])*<ul/);
  });

  it("shows every solution as a plain link under a Solutions heading", () => {
    const html = render();
    expect(html).toMatch(/<h2[^>]*>Solutions<\/h2>/);
    const links = linksIn(html);
    for (const solution of SOLUTIONS) {
      expect(links).toContainEqual({ label: solution.title, href: solutionPath(solution.slug) });
    }
  });

  it("lists Relay as in pilot and links the capabilities PDF", () => {
    const links = linksIn(render());
    expect(links.find((link) => link.href === RELAY.path)?.label).toMatch(/in pilot/i);
    expect(links).toContainEqual({ label: CAPABILITIES_PDF.label, href: "/capabilities.pdf" });
  });

  it("orders the links: solutions first, then Our work, About, Insights, Free tools, the call, the phone", () => {
    const labels = linksIn(render()).map((link) => link.label);
    expect(labels[0]).toBe(SOLUTIONS[0].title);
    expect(labels.slice(-6)).toEqual([
      "Our work",
      "About",
      "Insights",
      "Free tools",
      "Book a 20-min intro call",
      CONTACT.phone,
    ]);
  });

  it("has no 'How we help' and hides Insights when none are published", () => {
    expect(render()).not.toContain("How we help");
    expect(linksIn(render(false)).map((link) => link.label)).not.toContain("Insights");
  });
});
