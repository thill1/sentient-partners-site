// Types for siteNav.data.mjs (plain ESM so Node build scripts can import it).

export type SolutionGroupId = "advise" | "attract" | "automate" | "operate";

export interface SolutionGroup {
  id: SolutionGroupId;
  label: string;
  summary: string;
}

/** "capability" solutions have an interactive demo; "advisory" shows the process steps. */
export type SolutionKind = "advisory" | "capability";

export interface SolutionPageCopy {
  /** The line under the page title. */
  headline: string;
  /** The one-paragraph summary. */
  lede: string;
  /** "What's included"; empty for the advisory solution. */
  includes: string[];
}

export interface Solution {
  /** URL slug: the page is /solutions/<slug>/. */
  slug: string;
  kind: SolutionKind;
  group: SolutionGroupId;
  /** Name in menus, cards and the page H1. */
  title: string;
  /** One line for cards and the meta description. */
  summary: string;
  page: SolutionPageCopy;
}

export interface ProcessStep {
  title: string;
  copy: string;
}

export interface Relay {
  path: string;
  name: string;
  status: string;
  navLabel: string;
  eyebrow: string;
  headline: string;
  summary: string;
  points: string[];
}

export interface FreeTool {
  id: string;
  href: string;
  eyebrow: string;
  title: string;
  copy: string;
}

export type NavLinkKind = "download" | "book" | "chat" | "external";

export interface NavLink {
  id: string;
  label: string;
  /** Absent only for `kind: "chat"`, which is an in-app action. */
  href?: string;
  kind?: NavLinkKind;
  /** Hide when the build has no published Insights. */
  requiresInsights?: boolean;
}

export interface HeaderItem extends NavLink {
  href: string;
  /** Set on the item that opens the flat Solutions panel. */
  panel?: "solutions";
}

export interface FooterColumn {
  id: "solutions" | "company" | "tools" | "contact";
  heading: string;
  links: NavLink[];
}

export declare const SITE_ORIGIN: string;
export declare const BOOKING_URL: string;
export declare const CONTACT: {
  email: string;
  phone: string;
  phoneHref: string;
  linkedin: string;
};

export declare const SOLUTIONS_HUB_PATH: string;
export declare const RELAY_PATH: string;
export declare const TOOLS_HUB_PATH: string;
export declare const WEBSITE_CHECK_PATH: string;

export declare function solutionPath(slug: string): string;
export declare function hrefOnPage(href: string, isHomepage: boolean): string;

export declare const SOLUTION_GROUPS: SolutionGroup[];
export declare const PROCESS: {
  eyebrow: string;
  promise: string;
  steps: ProcessStep[];
};
export declare const SOLUTIONS: Solution[];
export declare const RELAY: Relay;
export declare const CAPABILITIES_PDF: {
  href: string;
  label: string;
  downloadLabel: string;
};
export declare const SOLUTIONS_HUB: {
  path: string;
  label: string;
  allLabel: string;
  headline: string;
  lede: string;
};

export declare const FREE_TOOLS: FreeTool[];
export declare const FREE_TOOLS_HUB: { href: string; label: string; allLabel: string };
export declare const TEMPLATES_LINK: { href: string; label: string };

export declare const HEADER_ITEMS: HeaderItem[];
export declare const HEADER_CTA: NavLink & { href: string; kind: "book" };
export declare const SOLUTIONS_PANEL: {
  heading: string;
  links: (NavLink & { href: string })[];
  footerLinks: (NavLink & { href: string })[];
};
export declare const FOOTER_COLUMNS: FooterColumn[];
export declare const FOOTER_LEGAL_LINKS: (NavLink & { href: string })[];
