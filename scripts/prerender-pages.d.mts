// Types for prerender-pages.mjs.

export interface PrerenderPage {
  /** URL path, with leading and trailing slash. */
  path: string;
  /** The page's <title>. */
  title: string;
  /** The meta description (also used for og: and twitter: descriptions). */
  desc: string;
}

export declare const PRERENDER_PAGES: PrerenderPage[];
