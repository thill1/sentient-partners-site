import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { PRERENDER_PAGES } from "../../../../scripts/prerender-pages.mjs";
import {
  CAPABILITIES_PDF,
  CAPABILITY_SOLUTIONS,
  FREE_TOOLS,
  PROCESS,
  RELAY,
  SOLUTIONS,
  SOLUTIONS_HUB,
  WEBSITE_CHECK_PATH,
  relatedSolutions,
  solutionPath,
} from "../../../content/siteNav";
import ToolsPage from "../ToolsPage";
import WebsiteCheckPage from "../tools/WebsiteCheckPage";
import RelayPage from "./RelayPage";
import SolutionPage from "./SolutionPage";
import SolutionsGrid from "./SolutionsGrid";
import SolutionsHubPage from "./SolutionsHubPage";
import { SOLUTION_DEMOS } from "./solutionDemos";

const render = (element: ReactElement) => renderToStaticMarkup(element);
const count = (html: string, pattern: RegExp) => (html.match(pattern) ?? []).length;
const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
/** Visible words only: tags dropped, entities decoded. */
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");

const BOOK_LABEL = "Book a 20-minute intro call";

describe("homepage solutions grid", () => {
  const html = render(<SolutionsGrid />);

  it("is the 'Solutions at a glance' section", () => {
    expect(html).toContain('id="solutions"');
    expect(text(html)).toContain("Solutions at a glance.");
  });

  it("has one card per capability plus Relay, each linking to its page", () => {
    const cardLinks = [...html.matchAll(/class="tool-card solution-card" href="([^"]+)"/g)].map((match) => match[1]);
    expect(cardLinks).toEqual([
      ...CAPABILITY_SOLUTIONS.map((solution) => solutionPath(solution.slug)),
      RELAY.path,
    ]);
    for (const solution of CAPABILITY_SOLUTIONS) {
      expect(text(html)).toContain(solution.title);
      expect(text(html)).toContain(solution.summary);
    }
  });

  it("labels Relay as in pilot and links the capabilities PDF and the hub", () => {
    expect(text(html)).toMatch(/In pilot\s+Sentient Relay/);
    expect(hrefs(html)).toContain(CAPABILITIES_PDF.href);
    expect(hrefs(html)).toContain(SOLUTIONS_HUB.path);
  });
});

describe("solutions hub", () => {
  const html = render(<SolutionsHubPage />);

  it("has one h1 and links every solution, Relay (in pilot) and the PDF", () => {
    expect(count(html, /<h1[\s>]/g)).toBe(1);
    expect(text(html)).toContain(SOLUTIONS_HUB.headline);
    for (const solution of SOLUTIONS) expect(hrefs(html)).toContain(solutionPath(solution.slug));
    expect(hrefs(html)).toContain(RELAY.path);
    expect(text(html)).toMatch(/In pilot\s+Sentient Relay/);
    expect(hrefs(html)).toContain(CAPABILITIES_PDF.href);
    expect(text(html)).toContain(BOOK_LABEL);
  });
});

describe("solution demos", () => {
  it("has a demo for each capability and none for the advisory solution", () => {
    expect(Object.keys(SOLUTION_DEMOS).sort()).toEqual(
      CAPABILITY_SOLUTIONS.map((solution) => solution.slug).sort(),
    );
  });
});

describe.each(SOLUTIONS)("solution page: $slug", (solution) => {
  const html = render(<SolutionPage solution={solution} />);
  const words = text(html);

  it("follows the template: title, summary, included, next steps, PDF", () => {
    expect(count(html, /<h1[\s>]/g)).toBe(1);
    expect(html).toMatch(new RegExp(`<h1[^>]*>${solution.title.replace("&", "&amp;")}</h1>`));
    expect(words).toContain(solution.page.lede);
    for (const item of solution.page.includes) expect(words).toContain(item);
    expect(words).toContain(BOOK_LABEL);
    expect(words).toContain(`Discuss ${solution.title}`);
    expect(hrefs(html)).toContain(CAPABILITIES_PDF.href);
    expect(hrefs(html)).toContain(SOLUTIONS_HUB.path);
  });

  it("shows the live demo for a capability, or how we partner for advisory", () => {
    if (solution.kind === "capability") {
      expect(html).toContain("solution-demo-screen");
      expect(words).toContain("What's included");
    } else {
      expect(html).not.toContain("solution-demo-screen");
      for (const step of PROCESS.steps) expect(words).toContain(step.copy);
      expect(words).toContain(PROCESS.promise);
    }
  });

  it("links the related solutions in the same group", () => {
    for (const other of relatedSolutions(solution)) {
      expect(hrefs(html)).toContain(solutionPath(other.slug));
    }
    expect(hrefs(html)).not.toContain(solutionPath(solution.slug));
  });
});

describe("Relay page", () => {
  const html = render(<RelayPage />);
  const words = text(html);

  it("has one h1 naming Relay as in pilot", () => {
    expect(count(html, /<h1[\s>]/g)).toBe(1);
    expect(text(html.match(/<h1[\s\S]*?<\/h1>/)?.[0] ?? "")).toMatch(/Sentient Relay\s+In pilot/);
    expect(words).toContain(RELAY.eyebrow);
  });

  it("reuses the showcase copy and offers the intro call", () => {
    expect(words).toContain("The service day, in one app.");
    expect(words).toContain(RELAY.summary);
    for (const point of RELAY.points) expect(words).toContain(point);
    expect(words).toContain(BOOK_LABEL);
    expect(words).toContain("Ask about Sentient Relay");
  });
});

describe("website check", () => {
  it("has its own page with one h1 and a way back to the tools", () => {
    const html = render(<WebsiteCheckPage />);
    expect(count(html, /<h1[\s>]/g)).toBe(1);
    expect(html).toContain('id="website-check"');
    expect(hrefs(html)).toContain("/tools/");
  });

  it("is the first card on /tools/, linking to its own page", () => {
    const html = render(<ToolsPage />);
    const cardLinks = [...html.matchAll(/class="tool-card" href="([^"]+)"/g)].map((match) => match[1]);
    expect(cardLinks).toEqual(FREE_TOOLS.map((tool) => tool.href));
    expect(cardLinks[0]).toBe(WEBSITE_CHECK_PATH);
    expect(count(html, /<h1[\s>]/g)).toBe(1);
    // The check itself stays on /tools/ so existing /tools/#website-check links keep working.
    expect(html).toContain('id="website-check"');
  });
});

describe("full pages", () => {
  // The whole app, as scripts/prerender.mjs renders it.
  let renderPath: (path: string) => string;
  beforeAll(async () => {
    // Set by Vite's `define` in real builds (see vite.config.ts).
    (globalThis as { __INSIGHTS_LIVE__?: boolean }).__INSIGHTS_LIVE__ = true;
    const { default: App } = await import("../../../App");
    renderPath = (path) => renderToStaticMarkup(<App path={path} />);
  });

  it("puts the solutions grid immediately after 'How we help' on the homepage", () => {
    const html = renderPath("/");
    const sections = [...html.matchAll(/<section[^>]*\sid="([^"]+)"/g)].map((match) => match[1]);
    const at = sections.indexOf("solutions");
    expect(sections[at - 1]).toBe("services");
    expect(sections[at + 1]).toBe("capabilities");
    expect(text(html)).toContain("Business Strategy. Intelligent Systems. Measurable Results.");
  });

  it.each(PRERENDER_PAGES)("$path renders its own page with exactly one h1", ({ path }) => {
    const html = renderPath(path);
    expect(count(html, /<h1[\s>]/g)).toBe(1);
    expect(html).not.toContain("golden-gate");
  });

  it.each(["/", ...PRERENDER_PAGES.map((page) => page.path)])("%s follows the copy rules", (path) => {
    const words = text(renderPath(path));
    expect(words).not.toMatch(/AI-First Agency/i);
    expect(words).not.toMatch(/\baudit/i);
    expect(words).not.toMatch(/troyhill@/i);
    expect(words).not.toMatch(/\b(Field|Office|Sentient)\s*OS\b/i);
    for (const mention of words.match(/.{0,30}\bRelay\b.{0,30}/g) ?? []) {
      // Every page that names Relay says it is in pilot.
      expect(words.toLowerCase(), mention).toContain("in pilot");
    }
  });
});
