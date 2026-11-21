import { ArrowRight, Phone } from "lucide-react";
import {
  CONTACT,
  HEADER_CTA,
  HEADER_ITEMS,
  SOLUTIONS_PANEL,
  hrefOnPage,
} from "../../content/siteNav";

export const MOBILE_NAVIGATION_ID = "mobile-navigation";

export interface MobileMenuProps {
  /** True on the homepage, where section links stay in-page. */
  isHome: boolean;
  /** False when the build has no published Insights; hides the Insights link. */
  insightsLive: boolean;
  /** Called when any link is followed, so the menu can close. */
  onNavigate: () => void;
  /** Called when the booking call to action is chosen. */
  onBook: () => void;
}

/**
 * The full-height menu for narrow screens. One flat list with nothing to
 * expand: the solutions are plain links under a "Solutions" heading, followed
 * by the other header items, the booking call to action and the phone number.
 */
export default function MobileMenu({
  isHome,
  insightsLive,
  onNavigate,
  onBook,
}: MobileMenuProps) {
  const items = HEADER_ITEMS.filter(
    (item) => insightsLive || !item.requiresInsights,
  );
  return (
    <nav
      id={MOBILE_NAVIGATION_ID}
      className="mobile-nav"
      aria-label="Mobile navigation"
    >
      {items.map((item) =>
        item.panel === "solutions" ? (
          <div key={item.id} className="mobile-nav-solutions">
            <h2 id="mobile-nav-solutions-heading">{SOLUTIONS_PANEL.heading}</h2>
            <ul aria-labelledby="mobile-nav-solutions-heading">
              {[...SOLUTIONS_PANEL.links, ...SOLUTIONS_PANEL.footerLinks].map(
                (link) => (
                  <li key={link.id}>
                    <a
                      href={hrefOnPage(link.href, isHome)}
                      onClick={onNavigate}
                    >
                      {link.label}
                    </a>
                  </li>
                ),
              )}
            </ul>
          </div>
        ) : (
          <a
            key={item.id}
            className="mobile-nav-item"
            href={hrefOnPage(item.href, isHome)}
            onClick={onNavigate}
          >
            {item.label}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        ),
      )}
      <a
        className="mobile-nav-book cta-primary"
        href={HEADER_CTA.href}
        onClick={(event) => {
          event.preventDefault();
          onBook();
        }}
      >
        {HEADER_CTA.label} <ArrowRight size={18} aria-hidden="true" />
      </a>
      <a className="mobile-nav-phone" href={CONTACT.phoneHref}>
        <Phone size={16} aria-hidden="true" /> {CONTACT.phone}
      </a>
    </nav>
  );
}
