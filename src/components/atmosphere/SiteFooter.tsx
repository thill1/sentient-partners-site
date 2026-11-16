import { ArrowUpRight } from "lucide-react";
import {
  FOOTER_COLUMNS,
  FOOTER_LEGAL_LINKS,
  hrefOnPage,
  type NavLink,
} from "../../content/siteNav";
import { openSentientChat } from "../../lib/siteActions";
import FooterFinale from "./FooterFinale";
import { bookIntroCall } from "./bookIntroCall";
import "./site-nav.css";

export interface SiteFooterProps {
  /** True on the homepage, where section links stay in-page ("#work" rather than "/#work"). */
  isHome: boolean;
  /** False when the build has no published Insights (see insights/lib.mjs); hides the Insights link. */
  insightsLive?: boolean;
}

/** One footer entry. The link's `kind` decides whether it is a link, a new-tab link or an in-app action. */
function FooterLink({ link, isHome }: { link: NavLink; isHome: boolean }) {
  if (link.kind === "chat" || !link.href) {
    return (
      <button type="button" onClick={() => openSentientChat({ source: "Footer" })}>
        {link.label}
      </button>
    );
  }
  if (link.kind === "book") {
    return (
      <a
        href={link.href}
        onClick={(event) => {
          event.preventDefault();
          bookIntroCall("Footer");
        }}
      >
        {link.label}
      </a>
    );
  }
  if (link.kind === "external") {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer">
        {link.label} <ArrowUpRight size={13} aria-hidden="true" />
      </a>
    );
  }
  return <a href={hrefOnPage(link.href, isHome)}>{link.label}</a>;
}

/**
 * The site footer: wordmark finale, tagline and place, then the link columns
 * and legal links from the shared nav data (src/content/siteNav), which the
 * Insights build reads too.
 */
export default function SiteFooter({
  isHome,
  insightsLive = __INSIGHTS_LIVE__,
}: SiteFooterProps) {
  return (
    <footer className="atmosphere-footer">
      <FooterFinale />
      <div className="page-width">
        <div className="footer-top">
          <div>
            <p className="footer-tagline">
              Business Strategy. Intelligent Systems. Measurable Results.
            </p>
            <p className="footer-place">
              Auburn, California
              <br />
              Placer County · Greater Sacramento
            </p>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.id} className={`footer-column footer-column-${column.id}`}>
              <span>{column.heading}</span>
              {column.links
                .filter((link) => insightsLive || !link.requiresInsights)
                .map((link) => (
                  <FooterLink key={link.id} link={link} isHome={isHome} />
                ))}
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Sentient Partners.</span>
          <span className="footer-legal">
            {FOOTER_LEGAL_LINKS.map((link) => (
              <a key={link.id} href={link.href}>
                {link.label}
              </a>
            ))}
          </span>
        </div>
      </div>
    </footer>
  );
}
