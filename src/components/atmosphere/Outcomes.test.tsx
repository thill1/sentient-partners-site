import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SOLUTION_GROUPS, SOLUTIONS_HUB_PATH, solutionPath } from "../../content/siteNav";
import Outcomes from "./Outcomes";

const outcomeLinks = () =>
  [...renderToStaticMarkup(<Outcomes />).matchAll(/<a class="text-link ov-link" href="([^"]+)"/g)].map(
    (match) => match[1],
  );

describe("How we help rows", () => {
  it("link to solution pages or solution groups, not into the carousel", () => {
    const links = outcomeLinks();
    expect(links).toHaveLength(4);
    const groupAnchors = SOLUTION_GROUPS.map((group) => `${SOLUTIONS_HUB_PATH}#solutions-${group.id}`);
    for (const href of links) {
      expect(href.startsWith("#")).toBe(false);
      expect([solutionPath("advisory"), ...groupAnchors]).toContain(href);
    }
  });
});
