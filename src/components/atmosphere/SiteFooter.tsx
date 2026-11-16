import { ArrowUpRight } from "lucide-react";
import { BOOKING_URL, BRAND } from "../../content/siteContent";
import { openSentientChat } from "../../lib/siteActions";
import FooterFinale from "./FooterFinale";
import { bookIntroCall } from "./bookIntroCall";

export interface SiteFooterProps {
  /** True on the homepage, where section links stay in-page ("#work" rather than "/#work"). */
  isHome: boolean;
}

/** The site footer: wordmark finale, tagline and place, link columns and legal links. */
export default function SiteFooter({ isHome }: SiteFooterProps) {
  const to = (hash: string) => (isHome ? hash : `/${hash}`);
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
          <div>
            <span>Explore</span>
            <a href={to("#services")}>How we help</a>
            <a href={to("#capabilities")}>Capabilities</a>
            <a href={to("#work")}>Our work</a>
            <a href={to("#founder")}>Our founder</a>
            <a href={to("#process")}>Our approach</a>
            <a href="/tools/">Tools</a>
            {__INSIGHTS_LIVE__ && <a href="/insights/">Insights</a>}
          </div>
          <div>
            <span>Let's connect</span>
            <a href={BRAND.phoneHref}>{BRAND.phone}</a>
            <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
            <a href={BRAND.linkedin} target="_blank" rel="noopener noreferrer">
              LinkedIn <ArrowUpRight size={13} aria-hidden="true" />
            </a>
            <a
              href={BOOKING_URL}
              onClick={(e) => {
                e.preventDefault();
                bookIntroCall("Footer");
              }}
            >
              Book a 20-minute intro call
            </a>
            <button onClick={() => openSentientChat({ source: "Footer" })}>
              Ask Sentient (chat or voice)
            </button>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Sentient Partners.</span>
          <span className="footer-legal">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
