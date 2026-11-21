import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RELAY } from "../../content/siteNav";
import { RelayShowcase } from "./RelayShowcase";
import { linksIn, textOf } from "./markupLinks";

describe("Relay showcase", () => {
  it("labels its link to the Relay page as in pilot, using the shared nav label", () => {
    const links = linksIn(renderToStaticMarkup(<RelayShowcase showOverviewLink />));
    const relayLinks = links.filter((link) => link.href === RELAY.path);
    expect(relayLinks).toEqual([{ label: RELAY.navLabel, href: RELAY.path }]);
    expect(relayLinks[0].label).toContain("in pilot");
  });

  it("has no link to the Relay page unless asked (on /relay/ itself)", () => {
    const links = linksIn(renderToStaticMarkup(<RelayShowcase headingLevel="h2" />));
    expect(links.filter((link) => link.href === RELAY.path)).toEqual([]);
  });

  it("shows the in-pilot eyebrow and the shared copy", () => {
    const words = textOf(renderToStaticMarkup(<RelayShowcase />));
    expect(words).toContain(RELAY.eyebrow);
    expect(words).toContain("The service day, in one app.");
    expect(words).toContain(RELAY.summary);
  });
});
