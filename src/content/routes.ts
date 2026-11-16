/**
 * Path-based routing for the prerendered pages. Pure, so the same function
 * serves the browser, the prerender and the tests.
 */
import {
  RELAY_PATH,
  SOLUTIONS_HUB_PATH,
  WEBSITE_CHECK_PATH,
  findSolution,
} from "./siteNav";

/** Which page is showing. "solution" pages also carry a `solutionSlug`. */
export type PageName =
  | "home"
  | "tools"
  | "website-check"
  | "missed-call"
  | "ai-readiness"
  | "time-back"
  | "reputation"
  | "solutions"
  | "solution"
  | "relay";

export interface PageRoute {
  name: PageName;
  /** Set only when `name` is "solution". */
  solutionSlug?: string;
}

const withoutTrailingSlash = (path: string) => path.replace(/\/+$/, "");

/**
 * The page for a URL path. Unknown paths under /tools and /solutions fall
 * back to their hub; anything else is the homepage.
 */
export function resolvePage(path: string): PageRoute {
  if (path.startsWith(withoutTrailingSlash(WEBSITE_CHECK_PATH))) return { name: "website-check" };
  if (path.startsWith("/tools/missed-call-calculator")) return { name: "missed-call" };
  if (path.startsWith("/tools/ai-readiness")) return { name: "ai-readiness" };
  if (path.startsWith("/tools/time-back")) return { name: "time-back" };
  if (path.startsWith("/tools/reputation")) return { name: "reputation" };
  if (path.startsWith("/tools")) return { name: "tools" };

  const solutionsHub = withoutTrailingSlash(SOLUTIONS_HUB_PATH);
  if (path === solutionsHub || path.startsWith(SOLUTIONS_HUB_PATH)) {
    const slug = path.slice(SOLUTIONS_HUB_PATH.length).split("/")[0];
    return slug && findSolution(slug)
      ? { name: "solution", solutionSlug: slug }
      : { name: "solutions" };
  }

  const relay = withoutTrailingSlash(RELAY_PATH);
  if (path === relay || path.startsWith(RELAY_PATH)) return { name: "relay" };

  return { name: "home" };
}
