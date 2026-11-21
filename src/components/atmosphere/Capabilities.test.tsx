import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CAPABILITY_SOLUTIONS, findSolution } from "../../content/siteNav";
import { Capabilities, JOURNEY_LABELS } from "./Capabilities";
import { textOf } from "./markupLinks";

describe("capabilities journey labels", () => {
  it("has one scene per capability solution", () => {
    expect(JOURNEY_LABELS.map((scene) => scene.slug).sort()).toEqual(
      CAPABILITY_SOLUTIONS.map((solution) => solution.slug).sort(),
    );
  });

  // The journey keeps its own Title Case labels; this pins each to its solution.
  it.each([
    ["search", "Search Visibility"],
    ["websites", "Premium Websites"],
    ["ai-chatbots", "AI Chat Assistants"],
    ["voice-agents", "AI Voice Agents"],
    ["scheduling", "Calendar & Scheduling"],
    ["business-apps", "Business Applications"],
    ["automation", "Workflow Automation"],
    ["reviews", "Reputation & Reviews"],
  ])("labels %s as '%s', the Title Case form of its solution title", (slug, name) => {
    expect(JOURNEY_LABELS.find((scene) => scene.slug === slug)?.name).toBe(name);
    expect(name.toLowerCase()).toBe(findSolution(slug)?.title.toLowerCase());
  });

  it("renders each label with that solution's copy from the shared data", () => {
    const words = textOf(renderToStaticMarkup(<Capabilities />));
    for (const { slug, name } of JOURNEY_LABELS) {
      const solution = findSolution(slug);
      expect(words).toContain(`Discuss ${name}`);
      expect(words).toContain(solution?.page.lede);
      expect(words).toContain(solution?.page.headline);
    }
  });
});
