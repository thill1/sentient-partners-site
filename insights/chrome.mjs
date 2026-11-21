// The site header and footer for the static Insights pages, as HTML strings.
//
// Every link comes from src/content/siteNav.data.mjs, the same data the React
// header and footer render (SiteHeader.tsx, MobileMenu.tsx, SiteFooter.tsx), so
// the two cannot drift. siteChromeParity.test.tsx checks they match.
// Behaviour (Solutions panel, mobile menu) lives in insights/nav.js.
import {
  CONTACT,
  FOOTER_COLUMNS,
  FOOTER_LEGAL_LINKS,
  HEADER_CTA,
  HEADER_ITEMS,
  SOLUTIONS_PANEL,
} from "../src/content/siteNav.data.mjs";

export const TAGLINE = "Business Strategy. Intelligent Systems. Measurable Results.";
export const SOLUTIONS_PANEL_ID = "solutions-panel";
export const MOBILE_NAVIGATION_ID = "mobile-navigation";

export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character],
  );

/** Links shown in this build: Insights links drop out when nothing is published. */
const visibleLinks = (links, insightsLive) => links.filter((link) => insightsLive || !link.requiresInsights);

const anchor = (link, attributes = "") =>
  `<a href="${escapeHtml(link.href)}"${attributes}>${escapeHtml(link.label)}</a>`;

const listItems = (links) => links.map((link) => `<li>${anchor(link)}</li>`).join("");

const MENU_ICON =
  '<svg class="ins-menu-icon-open" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>' +
  '<svg class="ins-menu-icon-close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

/** The desktop "Solutions" button and its single-level panel (closed until nav.js opens it). */
function solutionsMenu(item) {
  return `<div class="ins-solutions">
      <button type="button" class="ins-solutions-button" aria-expanded="false" aria-controls="${SOLUTIONS_PANEL_ID}">${escapeHtml(item.label)} <span aria-hidden="true">▾</span></button>
      <div id="${SOLUTIONS_PANEL_ID}" class="ins-solutions-panel" tabindex="-1" hidden>
        <ul class="ins-solutions-links">${listItems(SOLUTIONS_PANEL.links)}</ul>
        <ul class="ins-solutions-footer">${listItems(SOLUTIONS_PANEL.footerLinks)}</ul>
      </div>
    </div>`;
}

/** The narrow-screen menu: one flat list, the solutions as plain links, nothing to expand. */
function mobileMenu(items) {
  const entries = items
    .map((item) =>
      item.panel === "solutions"
        ? `<div class="ins-mobile-solutions">
      <h2 id="ins-mobile-solutions-heading">${escapeHtml(SOLUTIONS_PANEL.heading)}</h2>
      <ul aria-labelledby="ins-mobile-solutions-heading">${listItems([...SOLUTIONS_PANEL.links, ...SOLUTIONS_PANEL.footerLinks])}</ul>
    </div>`
        : anchor(item, ' class="ins-mobile-item"'),
    )
    .join("\n    ");
  return `<nav id="${MOBILE_NAVIGATION_ID}" class="ins-mobile-nav" aria-label="Mobile navigation" hidden>
    ${entries}
    ${anchor(HEADER_CTA, ' class="ins-mobile-book"')}
    ${anchor({ href: CONTACT.phoneHref, label: CONTACT.phone }, ' class="ins-mobile-phone"')}
  </nav>`;
}

/**
 * The site header. `insightsLive` is false when the build has no published
 * Insights, which hides the Insights link (as in the React header).
 */
export function renderSiteHeader({ insightsLive }) {
  const items = visibleLinks(HEADER_ITEMS, insightsLive);
  const desktopItems = items
    .map((item) => (item.panel === "solutions" ? solutionsMenu(item) : anchor(item)))
    .join("\n    ");
  return `<header class="ins-header">
  <nav class="ins-nav" aria-label="Main navigation">
    ${desktopItems}
  </nav>
  <a class="ins-brand" href="/" aria-label="Sentient Partners home">
    <img src="/atmosphere/sp-monogram-white-72.png" alt="" width="22" height="36">
    <span>Sentient Partners</span>
  </a>
  <a class="ins-book" href="${escapeHtml(HEADER_CTA.href)}">${escapeHtml(HEADER_CTA.label)} <span aria-hidden="true">→</span></a>
  <button type="button" class="ins-menu-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="${MOBILE_NAVIGATION_ID}">${MENU_ICON}</button>
  ${mobileMenu(items)}
</header>`;
}

/** One footer link. Returns "" for in-app actions (no href), which static pages leave out. */
function footerLink(link) {
  if (!link.href) return "";
  if (link.kind === "external") {
    return `<li>${anchor(link, ' target="_blank" rel="noopener noreferrer"')}</li>`;
  }
  return `<li>${anchor(link)}</li>`;
}

/** The site footer: tagline and place, the link columns, then the legal line. */
export function renderSiteFooter({ insightsLive, year }) {
  const columns = FOOTER_COLUMNS.map(
    (column) => `<div class="ins-footer-column ins-footer-column-${escapeHtml(column.id)}">
      <h2>${escapeHtml(column.heading)}</h2>
      <ul>${visibleLinks(column.links, insightsLive).map(footerLink).join("")}</ul>
    </div>`,
  ).join("\n    ");
  return `<footer class="ins-footer">
  <div class="ins-footer-top">
    <div class="ins-footer-brand">
      <p class="ins-footer-tagline">${escapeHtml(TAGLINE)}</p>
      <p class="ins-footer-place">Auburn, California<br>Placer County · Greater Sacramento</p>
    </div>
    ${columns}
  </div>
  <div class="ins-footer-bottom">
    <span>© ${escapeHtml(year)} Sentient Partners.</span>
    <nav class="ins-footer-legal" aria-label="Legal">${FOOTER_LEGAL_LINKS.map((link) => anchor(link)).join("")}</nav>
  </div>
</footer>`;
}
