import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { PROCESS } from "../../content/siteNav";
import { elementHtml, textOf } from "./markupLinks";

/** The Discover / Design / Deliver steps appear on the homepage and on /solutions/advisory/. */
describe("process steps", () => {
  let home = "";
  let advisory = "";
  beforeAll(async () => {
    // Set by Vite's `define` in real builds (see vite.config.ts).
    (globalThis as { __INSIGHTS_LIVE__?: boolean }).__INSIGHTS_LIVE__ = true;
    const { default: App } = await import("../../App");
    home = renderToStaticMarkup(<App path="/" />);
    advisory = renderToStaticMarkup(<App path="/solutions/advisory/" />);
  });

  /** [title, copy] for each step inside a container, in order. */
  const stepsIn = (containerHtml: string, itemTag: "article" | "li", titleTag: "h3" | "strong", copyTag: "p" | "span") =>
    [...containerHtml.matchAll(new RegExp(`<${itemTag}\\b[^>]*>([\\s\\S]*?)</${itemTag}>`, "g"))].map(([, item]) => [
      textOf(item.match(new RegExp(`<${titleTag}\\b[^>]*>([\\s\\S]*?)</${titleTag}>`))?.[1] ?? ""),
      textOf(item.match(new RegExp(`<${copyTag}\\b[^>]*>([\\s\\S]*?)</${copyTag}>`))?.[1] ?? ""),
    ]);
  const expected = PROCESS.steps.map((step) => [step.title, step.copy]);

  it("are Discover, Design, Deliver with the approved copy", () => {
    expect(expected).toEqual([
      ["Discover", "We learn your business, where it sticks, and what's worth fixing first."],
      ["Design", "A practical strategy, clear priorities, and a roadmap we agree on."],
      ["Deliver", "We build, test and launch with your team, then refine as you grow."],
    ]);
  });

  it("render the same step copy on the homepage and the advisory page", () => {
    const homeSteps = stepsIn(elementHtml(home, /<div class="process-grid"[^>]*>/), "article", "h3", "p");
    const advisorySteps = stepsIn(elementHtml(advisory, /<ol class="solution-steps"[^>]*>/), "li", "strong", "span");
    expect(homeSteps).toEqual(expected);
    expect(advisorySteps).toEqual(expected);
    expect(homeSteps).toEqual(advisorySteps);
  });

  it("number the homepage steps 01 to 03", () => {
    const grid = elementHtml(home, /<div class="process-grid"[^>]*>/);
    expect([...grid.matchAll(/<article><span>(\d\d)<\/span>/g)].map((match) => match[1])).toEqual(["01", "02", "03"]);
  });
});
