import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRERENDER_PAGES } from "../../scripts/prerender-pages.mjs";
import { resolvePage } from "./routes";
import { BOOKING_URL as SITE_CONTENT_BOOKING_URL, BRAND } from "./siteContent";
import * as siteNav from "./siteNav";
import {
  BOOKING_URL,
  CAPABILITIES_PDF,
  CAPABILITY_SOLUTIONS,
  CONTACT,
  FOOTER_COLUMNS,
  FOOTER_LEGAL_LINKS,
  FREE_TOOLS,
  HEADER_CTA,
  HEADER_ITEMS,
  RELAY,
  SITE_ORIGIN,
  SOLUTIONS,
  SOLUTIONS_HUB,
  SOLUTIONS_PANEL,
  SOLUTION_GROUPS,
  WEBSITE_CHECK_PATH,
  findSolution,
  groupOfSolution,
  hrefOnPage,
  relatedSolutions,
  solutionPath,
} from "./siteNav";

const DATA_FILE = "src/content/siteNav.data.mjs";
const sitemap = readFileSync("public/sitemap.xml", "utf8");
const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
  match[1].replace(SITE_ORIGIN, ""),
);
const prerenderPaths = PRERENDER_PAGES.map((page) => page.path);

/** Every string anywhere in the exported data: labels, copy, hrefs. */
function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(allStrings);
  return [];
}
const everyString = allStrings({ ...siteNav });
const everyNavLink = [
  ...HEADER_ITEMS,
  HEADER_CTA,
  ...SOLUTIONS_PANEL.links,
  ...SOLUTIONS_PANEL.footerLinks,
  ...FOOTER_COLUMNS.flatMap((column) => column.links),
  ...FOOTER_LEGAL_LINKS,
];

describe("header", () => {
  it("lists the items in the agreed order, then the intro-call CTA", () => {
    expect(HEADER_ITEMS.map((item) => item.label)).toEqual([
      "Solutions",
      "Our work",
      "About",
      "Insights",
      "Free tools",
    ]);
    expect(HEADER_CTA.label).toBe("Book a 20-min intro call");
    expect(HEADER_CTA.href).toBe(BOOKING_URL);
  });

  it("drops 'How we help' and 'Our founder', and has no Demos item yet", () => {
    const labels = HEADER_ITEMS.map((item) => item.label);
    expect(labels).not.toContain("How we help");
    expect(labels).not.toContain("Our founder");
    expect(labels).not.toContain("Demos");
    expect(everyString.filter((text) => text.includes("/demos"))).toEqual([]);
  });

  it("marks where the Demos item goes: right after Solutions", () => {
    const lines = readFileSync(DATA_FILE, "utf8").split("\n");
    const todo = lines.findIndex((line) => line.includes("TODO(demos): add after PR #55"));
    expect(todo).toBeGreaterThan(0);
    expect(lines[todo - 1]).toContain('id: "solutions"');
    expect(lines[todo + 1]).toContain('id: "work"');
  });

  it("opens the Solutions panel from the Solutions item only", () => {
    expect(HEADER_ITEMS.filter((item) => item.panel).map((item) => item.id)).toEqual(["solutions"]);
    expect(HEADER_ITEMS[0].href).toBe(SOLUTIONS_HUB.path);
  });
});

describe("solutions panel", () => {
  it("is one flat list: every solution, then Relay, then the hub and the PDF", () => {
    expect(SOLUTIONS_PANEL.links.map((link) => link.href)).toEqual([
      ...SOLUTIONS.map((solution) => solutionPath(solution.slug)),
      RELAY.path,
    ]);
    expect(SOLUTIONS_PANEL.footerLinks.map((link) => link.href)).toEqual([
      SOLUTIONS_HUB.path,
      "/capabilities.pdf",
    ]);
  });
});

describe("solutions", () => {
  it("has the advisory solution plus the eight capabilities, with unique URL-safe slugs", () => {
    expect(SOLUTIONS.map((solution) => solution.slug)).toEqual([
      "advisory",
      "websites",
      "search",
      "ai-chatbots",
      "voice-agents",
      "scheduling",
      "reviews",
      "business-apps",
      "automation",
    ]);
    expect(CAPABILITY_SOLUTIONS).toHaveLength(8);
    for (const solution of SOLUTIONS) expect(solution.slug).toMatch(/^[a-z0-9-]+$/);
  });

  it.each(SOLUTIONS)("$slug has a title, summary, page copy and a known group", (solution) => {
    expect(solution.title.trim()).not.toBe("");
    expect(solution.summary.trim()).not.toBe("");
    expect(solution.page.headline.trim()).not.toBe("");
    expect(solution.page.lede.trim()).not.toBe("");
    expect(SOLUTION_GROUPS).toContain(groupOfSolution(solution));
    if (solution.kind === "capability") expect(solution.page.includes.length).toBeGreaterThan(0);
  });

  it.each(SOLUTIONS)("$slug has a route, a prerendered page and a sitemap entry", (solution) => {
    const path = solutionPath(solution.slug);
    expect(path).toBe(`/solutions/${solution.slug}/`);
    expect(resolvePage(path)).toEqual({ name: "solution", solutionSlug: solution.slug });
    expect(resolvePage(path.replace(/\/$/, ""))).toEqual({ name: "solution", solutionSlug: solution.slug });
    expect(prerenderPaths).toContain(path);
    expect(sitemapPaths).toContain(path);
    expect(findSolution(solution.slug)).toBe(solution);
  });

  it("relates solutions within the same group, never to themselves", () => {
    for (const solution of SOLUTIONS) {
      const related = relatedSolutions(solution);
      expect(related).not.toContain(solution);
      for (const other of related) expect(other.group).toBe(solution.group);
    }
  });

  it("routes the hub, and unknown solution slugs fall back to the hub", () => {
    expect(resolvePage("/solutions/")).toEqual({ name: "solutions" });
    expect(resolvePage("/solutions")).toEqual({ name: "solutions" });
    expect(resolvePage("/solutions/not-a-solution/")).toEqual({ name: "solutions" });
    expect(prerenderPaths).toContain(SOLUTIONS_HUB.path);
    expect(sitemapPaths).toContain(SOLUTIONS_HUB.path);
  });
});

describe("Sentient Relay", () => {
  it("is always labelled in pilot", () => {
    expect(RELAY.navLabel).toContain("in pilot");
    expect(RELAY.status.toLowerCase()).toBe("in pilot");
    expect(RELAY.eyebrow.toLowerCase()).toContain("in pilot");
    for (const link of everyNavLink.filter((candidate) => candidate.href === RELAY.path)) {
      expect(link.label).toContain("in pilot");
    }
  });

  it("has a route, a prerendered page titled in pilot, and a sitemap entry", () => {
    expect(RELAY.path).toBe("/relay/");
    expect(resolvePage("/relay/")).toEqual({ name: "relay" });
    expect(resolvePage("/relay")).toEqual({ name: "relay" });
    expect(sitemapPaths).toContain(RELAY.path);
    const page = PRERENDER_PAGES.find((candidate) => candidate.path === RELAY.path);
    expect(page?.title).toContain("in pilot");
  });
});

describe("free tools", () => {
  it("lists the website check first, at its own URL", () => {
    expect(FREE_TOOLS[0].href).toBe("/tools/website-check/");
    expect(WEBSITE_CHECK_PATH).toBe("/tools/website-check/");
    expect(resolvePage(WEBSITE_CHECK_PATH)).toEqual({ name: "website-check" });
    const toolsColumn = FOOTER_COLUMNS.find((column) => column.id === "tools");
    expect(toolsColumn?.links[0].href).toBe(WEBSITE_CHECK_PATH);
  });

  it.each(FREE_TOOLS)("$id has its own route, prerendered page and sitemap entry", (tool) => {
    expect(resolvePage(tool.href).name).not.toBe("tools");
    expect(resolvePage(tool.href).name).not.toBe("home");
    expect(prerenderPaths).toContain(tool.href);
    expect(sitemapPaths).toContain(tool.href);
  });

  it("keeps the existing routes working", () => {
    expect(resolvePage("/")).toEqual({ name: "home" });
    expect(resolvePage("/tools/")).toEqual({ name: "tools" });
    expect(resolvePage("/tools/missed-call-calculator/")).toEqual({ name: "missed-call" });
    expect(resolvePage("/tools/ai-readiness/")).toEqual({ name: "ai-readiness" });
    expect(resolvePage("/tools/time-back/")).toEqual({ name: "time-back" });
    expect(resolvePage("/tools/reputation/")).toEqual({ name: "reputation" });
    expect(resolvePage("/privacy")).toEqual({ name: "home" });
  });
});

describe("capabilities overview PDF", () => {
  it("links to the static file, which exists", () => {
    expect(CAPABILITIES_PDF.href).toBe("/capabilities.pdf");
    expect(existsSync("public/capabilities.pdf")).toBe(true);
    expect(everyNavLink.some((link) => link.href === "/capabilities.pdf")).toBe(true);
  });
});

describe("footer", () => {
  it("has four columns: Solutions, Company, Free tools, Let's connect", () => {
    expect(FOOTER_COLUMNS.map((column) => column.heading)).toEqual([
      "Solutions",
      "Company",
      "Free tools",
      "Let's connect",
    ]);
    expect(FOOTER_LEGAL_LINKS.map((link) => link.label)).toEqual(["Privacy", "Terms"]);
  });

  it("lists every solution and Relay in the Solutions column", () => {
    const hrefs = FOOTER_COLUMNS[0].links.map((link) => link.href);
    for (const solution of SOLUTIONS) expect(hrefs).toContain(solutionPath(solution.slug));
    expect(hrefs).toContain(RELAY.path);
    expect(hrefs).toContain(SOLUTIONS_HUB.path);
  });

  it("gives every link an href, except the in-app chat action", () => {
    for (const link of everyNavLink) {
      if (link.kind === "chat") expect(link.href).toBeUndefined();
      else expect(link.href).toMatch(/^(\/|https:\/\/|mailto:|tel:)/);
    }
  });
});

describe("links", () => {
  it("point at pages that exist: prerendered, static, or a homepage section", () => {
    const staticPaths = ["/", "/insights/", "/privacy", "/terms", "/capabilities.pdf"];
    for (const link of everyNavLink) {
      if (!link.href?.startsWith("/")) continue;
      const path = link.href.split("#")[0];
      expect([...prerenderPaths, ...staticPaths], `${link.label} -> ${link.href}`).toContain(path);
    }
  });

  it("shortens homepage section links on the homepage only", () => {
    expect(hrefOnPage("/#work", true)).toBe("#work");
    expect(hrefOnPage("/#work", false)).toBe("/#work");
    expect(hrefOnPage("/tools/#templates", true)).toBe("/tools/#templates");
    expect(hrefOnPage("/solutions/", true)).toBe("/solutions/");
  });
});

describe("prerender and sitemap", () => {
  it("lists each prerendered page once, each with a sitemap entry", () => {
    expect(new Set(prerenderPaths).size).toBe(prerenderPaths.length);
    for (const path of prerenderPaths) expect(sitemapPaths).toContain(path);
    expect(new Set(sitemapPaths).size).toBe(sitemapPaths.length);
  });

  it("gives each page a unique title and a description", () => {
    const titles = PRERENDER_PAGES.map((page) => page.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const page of PRERENDER_PAGES) {
      expect(page.path).toMatch(/^\/.*\/$/);
      expect(page.title).toMatch(/ \| Sentient Partners$/);
      expect(page.desc.trim()).not.toBe("");
      // Titles and descriptions are written into HTML attributes as they are.
      expect(page.desc).not.toMatch(/["<>]/);
    }
  });
});

describe("copy rules", () => {
  const pageCopy = allStrings(PRERENDER_PAGES);
  const copy = [...everyString, ...pageCopy];

  it("never uses the banned phrases", () => {
    for (const text of copy) {
      expect(text).not.toMatch(/AI-First Agency/i);
      expect(text).not.toMatch(/audit/i);
    }
  });

  it("uses hello@ only", () => {
    for (const text of copy) expect(text).not.toMatch(/troyhill@/i);
    const emails = copy.flatMap((text) => text.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? []);
    expect(new Set(emails)).toEqual(new Set(["hello@sentientpartners.ai"]));
    expect(readFileSync(DATA_FILE, "utf8")).not.toMatch(/troyhill@/i);
  });

  it("leaves Field OS, Office OS and Sentient OS off the site", () => {
    for (const text of copy) expect(text).not.toMatch(/\b(Field|Office|Sentient)\s*OS\b/i);
  });

  it("matches the brand details used elsewhere on the site", () => {
    expect(BOOKING_URL).toBe(SITE_CONTENT_BOOKING_URL);
    // insights/lib.mjs keeps its own copies for the static Insights build.
    const insightsLib = readFileSync("insights/lib.mjs", "utf8");
    expect(insightsLib).toContain(`"${BOOKING_URL}"`);
    expect(insightsLib).toContain(`SITE = "${SITE_ORIGIN}"`);
    expect(CONTACT.email).toBe(BRAND.email);
    expect(CONTACT.phone).toBe(BRAND.phone);
    expect(CONTACT.phoneHref).toBe(BRAND.phoneHref);
    expect(CONTACT.linkedin).toBe(BRAND.linkedin);
  });
});
