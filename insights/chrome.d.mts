// Types for chrome.mjs (plain ESM so insights/build.mjs can import it under Node).

export declare const TAGLINE: string;
export declare const SOLUTIONS_PANEL_ID: string;
export declare const MOBILE_NAVIGATION_ID: string;

export declare function escapeHtml(value: unknown): string;

export interface SiteHeaderOptions {
  /** False when the build has no published Insights; hides the Insights link. */
  insightsLive: boolean;
}

export interface SiteFooterOptions extends SiteHeaderOptions {
  /** The copyright year. */
  year: number;
}

export declare function renderSiteHeader(options: SiteHeaderOptions): string;
export declare function renderSiteFooter(options: SiteFooterOptions): string;
