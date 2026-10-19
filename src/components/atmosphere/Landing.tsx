import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ArrowUpRight, Menu, Phone, X } from "lucide-react";
import type { BannerDisplayState } from "../../types";
import { BOOKING_URL, BRAND } from "../../content/siteContent";
import {
  openBookingModal,
  openContactModal,
  openSentientChat,
} from "../../lib/siteActions";
import { GoldenGate } from "./GoldenGate";
import { Capabilities } from "./Capabilities";
import "./atmosphere.css";
import "./cohesion.css";
import { useScrollReveal } from "./useScrollReveal";
import Perspective from "./Perspective";
import Outcomes from "./Outcomes";
import Contact from "./Contact";
import { Connected } from "./Connected";
import {
  useFounderMotion,
  useAuburnMotion,
  useProcessMotion,
  useWorkMotion,
} from "./sectionMotion";
import FooterFinale from "./FooterFinale";
import SignupBand from "./SignupBand";
import SiteCheck from "./SiteCheck";
import PageAtmosphere from "../../fabric/PageAtmosphere";
import { loadFabric } from "../../fabric/motion";
import "./launch.css";
import "./polish.css";

const book = (source: string) =>
  openBookingModal({ source, ctaLabel: "Book a 20-minute introductory call" });
function Brand() {
  return (
    <a className="brand-lockup" href="#top">
      <img
        className="monogram-light"
        src="/atmosphere/sp-monogram-white.png"
        alt=""
        width="513"
        height="835"
      />
      <img
        className="monogram-ink"
        src="/atmosphere/sp-monogram-navy.png"
        alt=""
        width="513"
        height="835"
      />
      <span>Sentient Partners</span>
    </a>
  );
}
const links = [
  ["Capabilities", "#capabilities"],
  ["Our founder", "#founder"],
  ["Our work", "#work"],
  ["Website check", "#website-check"],
  // Hidden when the build has no published Insights (see insights/lib.mjs).
  ...(__INSIGHTS_LIVE__ ? [["Insights", "/insights/"]] : []),
];
function Navigation() {
  const [menu, setMenu] = useState(false),
    [onLight, setOnLight] = useState(false),
    [scrolled, setScrolled] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    // The header has no bar of its own, so its lettering follows whatever
    // section is behind it: ink over light backgrounds, ivory over dark.
    let frame = 0;
    const update = () => {
      frame = 0;
      // The bar arrives as the descent reaches its second line of copy
      // (the descent note fades in from 47% of the hero's scroll).
      const hero = document
        .querySelector(".golden-gate")
        ?.getBoundingClientRect();
      setScrolled(
        hero
          ? -hero.top / Math.max(1, hero.height - innerHeight) > 0.47
          : scrollY > 8,
      );
      const under = document
        .elementsFromPoint(innerWidth / 2, 50)
        .find((element) => !header.current?.contains(element));
      // Illustrations (paper mock-ups, demo screens) never flip the header;
      // only the section's own background counts.
      let element: Element | null = under?.closest("section") ?? under ?? null;
      while (element) {
        const [r, g, b, a = 1] = (
          getComputedStyle(element).backgroundColor.match(/[\d.]+/g) ?? []
        ).map(Number);
        if (a > 0.5) {
          setOnLight(0.2126 * r + 0.7152 * g + 0.0722 * b > 150);
          return;
        }
        element = element.parentElement;
      }
      setOnLight(false);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    };
  }, []);
  useEffect(() => {
    if (!menu) return;
    // Full-height menu: lock the page, trap focus, close on Escape.
    const root = document.documentElement;
    root.classList.add("menu-open");
    let lenis: { stop: () => void; start: () => void } | undefined;
    loadFabric().then((f) => {
      lenis = f?.lenis ?? undefined;
      lenis?.stop();
    });
    const focusables = () => [
      ...document.querySelectorAll<HTMLElement>(
        ".site-header .menu-toggle, #mobile-navigation a",
      ),
    ];
    focusables()[1]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      // The menu is portaled to <body>, so DOM order doesn't match the visual
      // order: always move focus explicitly within [toggle, ...menu links].
      const items = focusables();
      if (!items.length) return;
      e.preventDefault();
      const at = items.indexOf(document.activeElement as HTMLElement);
      const step = e.shiftKey ? -1 : 1;
      const next = at < 0 ? 0 : (at + step + items.length) % items.length;
      items[next]?.focus();
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      root.classList.remove("menu-open");
      lenis?.start();
    };
  }, [menu]);
  return (
    <header
      ref={header}
      className={`site-header ${onLight && !menu ? "header-on-light" : ""} ${scrolled ? "header-scrolled" : ""}`}
    >
      <div className="header-inner">
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <Brand />
        <a
          className="header-book"
          href={BOOKING_URL}
          onClick={(e) => {
            e.preventDefault();
            book("Navigation");
          }}
        >
          Book an intro call <ArrowRight size={15} aria-hidden="true" />
        </a>
        <button
          ref={menuButton}
          className="menu-toggle"
          aria-label={menu ? "Close navigation" : "Open navigation"}
          aria-expanded={menu}
          aria-controls="mobile-navigation"
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </div>
      {/* Portaled to <body>: the scrolled header's backdrop-filter makes it the
          containing block for fixed children, which clipped the panel. */}
      {menu &&
        createPortal(
          <nav
            id="mobile-navigation"
            className="mobile-nav"
            aria-label="Mobile navigation"
          >
            {links.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenu(false)}>
                {label}
                <ArrowRight size={18} aria-hidden="true" />
              </a>
            ))}
            <a
              className="mobile-nav-book cta-primary"
              href={BOOKING_URL}
              onClick={(e) => {
                e.preventDefault();
                setMenu(false);
                book("Mobile menu");
              }}
            >
              Book a 20-minute intro call <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className="mobile-nav-phone" href={BRAND.phoneHref}>
              <Phone size={16} aria-hidden="true" /> {BRAND.phone}
            </a>
          </nav>,
          document.body,
        )}
    </header>
  );
}

/* After the hero, a quiet dock keeps the two next steps in reach: a bottom
   bar on phones, a floating concierge pill on desktop (the header already
   carries the booking pill there). It steps aside near the contact finale. */
function ActionDock() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const hero = document.querySelector(".golden-gate");
    const finale = document.querySelector("#contact");
    const footer = document.querySelector(".atmosphere-footer");
    // On desktop the pinned Capabilities panel puts its own action where the
    // floating pill sits, so the dock steps aside there too.
    const showcase = matchMedia("(min-width: 851px)").matches
      ? document.querySelector("#capabilities")
      : null;
    let pastHero = false;
    let nearEnd = false;
    const sync = () => setShown(pastHero && !nearEnd);
    const heroObserver = new IntersectionObserver(([entry]) => {
      pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      sync();
    });
    const visible = new Set<Element>();
    const endObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) =>
        entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target),
      );
      nearEnd = visible.size > 0;
      sync();
    });
    if (hero) heroObserver.observe(hero);
    [finale, footer, showcase].forEach((el) => el && endObserver.observe(el));
    return () => {
      heroObserver.disconnect();
      endObserver.disconnect();
    };
  }, []);
  return (
    <div className={`action-dock ${shown ? "is-shown" : ""}`} aria-hidden={!shown}>
      <a
        className="dock-book"
        href={BOOKING_URL}
        tabIndex={shown ? 0 : -1}
        onClick={(e) => {
          e.preventDefault();
          book("Action dock");
        }}
      >
        Book a call <ArrowRight size={16} aria-hidden="true" />
      </a>
      <button
        type="button"
        className="dock-ask"
        tabIndex={shown ? 0 : -1}
        onClick={() => openSentientChat({ source: "Action dock" })}
      >
        <img src="/atmosphere/sp-monogram-white.png" alt="" width="12" height="20" />
        Ask Sentient
      </button>
      <a
        className="dock-call"
        href={BRAND.phoneHref}
        tabIndex={shown ? 0 : -1}
        aria-label={`Call ${BRAND.phone}`}
      >
        <Phone size={18} aria-hidden="true" />
      </a>
    </div>
  );
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Landing(_props: { banner: BannerDisplayState }) {
  useScrollReveal();
  useWorkMotion();
  useFounderMotion();
  useProcessMotion();
  useAuburnMotion();
  return (
    <div className="atmosphere-page" id="top">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <PageAtmosphere />
      <Navigation />
      <main id="main-content" tabIndex={-1}>
        <GoldenGate />
        <Perspective />
        <Outcomes />
        <Capabilities />
        <section id="founder" className="founder-section section-space">
          <div className="page-width founder-layout">
            <div className="founder-portrait">
              <span className="founder-portrait-frame">
                <img
                  src="/atmosphere/troy-hill-founder-480.webp"
                  srcSet="/atmosphere/troy-hill-founder-480.webp 480w, /atmosphere/troy-hill-founder-960.webp 960w"
                  sizes="(max-width: 600px) 100vw, 410px"
                  alt="Troy Hill, Founder and Principal Consultant at Sentient Partners"
                  loading="lazy"
                  width="480"
                  height="476"
                />
              </span>
              <div>
                <strong>Troy Hill</strong>
                <span>Founder & Principal Consultant</span>
              </div>
            </div>
            <div className="founder-copy">
              <span className="fd-line" aria-hidden="true" />
              <p className="eyebrow">Meet your partner</p>
              <h2>
                Enterprise experience.
                <br />
                <em>Personal accountability.</em>
              </h2>
              <p className="lead-copy">
                Three decades of software that can't fail.
                <br />
                Now built for the businesses down the street.
              </p>
              <p>
                Troy spent more than a decade at E*TRADE, rising from the global
                trading desk to Director of Enterprise Quality Assurance. His
                team stood behind every E*TRADE product release from 2006 to
                2011, and he led the technology integration of the $2.3B Harris
                Direct and BrownCo acquisitions.
              </p>
              <p>
                At Hewlett-Packard he became Global Quality Director, running
                quality operations across 178 countries and leading the
                migration of more than 12,000 applications. He founded the
                software-quality consultancy Qualitonomy in 2016, then Sentient
                Partners, to bring the same discipline to the businesses in his
                own community.
              </p>
              <ul className="founder-facts" aria-label="Career highlights">
                <li>
                  <strong>178</strong> countries in HP's global quality
                  operation
                </li>
                <li>
                  <strong>12,000+</strong> applications migrated across 30+ data
                  centers
                </li>
                <li>
                  <strong>Every</strong> E*TRADE product release, 2006 to 2011
                </li>
              </ul>
              <div className="founder-actions">
              <a
                className="cta-primary"
                href={BOOKING_URL}
                onClick={(e) => {
                  e.preventDefault();
                  book("Founder");
                }}
              >
                Book a 20-minute intro call <ArrowRight size={16} aria-hidden="true" />
              </a>
              <a
                className="text-link"
                href={BRAND.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                Troy on LinkedIn <ArrowUpRight size={15} aria-hidden="true" />
              </a>
              </div>
            </div>
          </div>
        </section>
        <Connected />
        <section id="work" className="work-section section-space">
          <div className="page-width">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Where we work</p>
                <h2>
                  Built for the way
                  <br />
                  <em>business actually happens.</em>
                </h2>
              </div>
              <p>
                Service businesses run on calls, schedules, crews and invoices.
                These are the systems we build to keep all four moving.
              </p>
            </div>
            <div className="work-grid">
              <article>
                <div className="work-visual field-visual" aria-hidden="true">
                  <div className="field-preview">
                    <span>SERVICE DAY</span>
                    <div>
                      <i /> Dispatch & scheduling
                    </div>
                    <div>
                      <i /> Field notes & job status
                    </div>
                    <div>
                      <i /> Invoice preparation
                    </div>
                    <div className="field-summary">
                      From the office to the field <ArrowRight size={15} />
                    </div>
                  </div>
                </div>
                <p className="eyebrow">Field operations</p>
                <h3>
                  More time on the job.
                  <br />
                  Less time chasing details.
                </h3>
                <p>
                  HVAC service workflows and field applications that connect
                  scheduling, job information, and invoicing.
                </p>
                <button
                  className="text-link"
                  onClick={() =>
                    openContactModal({
                      source: "Field operations work",
                      inquiry:
                        "I would like to discuss field operations for my business.",
                    })
                  }
                >
                  Talk about field operations <ArrowRight size={15} aria-hidden="true" />
                </button>
              </article>
              <article>
                <div className="work-visual customer-visual" aria-hidden="true">
                  <div className="estimate-preview">
                    <span>A CLEARER CUSTOMER JOURNEY</span>
                    <strong>
                      A fresh start,
                      <br />
                      <em>made simple.</em>
                    </strong>
                    <div>
                      Discover <ArrowRight size={12} /> Estimate{" "}
                      <ArrowRight size={12} /> Schedule
                    </div>
                  </div>
                </div>
                <p className="eyebrow">Customer experience</p>
                <h3>
                  A better experience.
                  <br />
                  From the first inquiry.
                </h3>
                <p>
                  Cleaning business websites, estimating tools, and
                  customer-facing systems that make the next step clear.
                </p>
                <button
                  className="text-link"
                  onClick={() =>
                    openContactModal({
                      source: "Customer experience work",
                      inquiry:
                        "I would like to discuss my website and customer experience.",
                    })
                  }
                >
                  Talk about your customer experience{" "}
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </article>
              <article>
                <div className="work-visual relay-visual" aria-hidden="true">
                  <div className="relay-symbol">
                    r<span>elay</span>
                  </div>
                  <div className="relay-lines">
                    <span>Customers</span>
                    <i />
                    <span>Operations</span>
                    <i />
                    <span>Insights</span>
                  </div>
                </div>
                <p className="eyebrow">Sentient Relay · In development</p>
                <h3>
                  Connected operations.
                  <br />A stronger foundation.
                </h3>
                <p>
                  Our reusable service-business platform brings together lessons
                  from custom applications, automation, and QuickBooks-connected
                  workflows.
                </p>
                <button
                  className="text-link"
                  onClick={() =>
                    openContactModal({
                      source: "Sentient Relay interest",
                      inquiry:
                        "I would like to learn about Sentient Relay, currently in development.",
                    })
                  }
                >
                  Ask about Sentient Relay <ArrowRight size={15} aria-hidden="true" />
                </button>
              </article>
            </div>
            <p className="work-disclosure">
              Illustrations of the kinds of systems we build.
            </p>
          </div>
        </section>
        <SiteCheck />
        <section id="process" className="process-section section-space">
          <div className="page-width">
            <div className="section-heading">
              <div>
                <p className="eyebrow">How we partner</p>
                <h2>
                  Clear thinking.
                  <br />
                  <em>Careful execution.</em>
                </h2>
              </div>
              <p className="process-promise">
                <strong>Direct access to your partner.</strong>
                <br />
                No account managers, no hand-offs. The person you meet on the
                first call is the person who builds your system.
              </p>
            </div>
            <div className="process-grid">
              <svg
                className="ps-thread"
                viewBox="0 0 1000 40"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  className="ps-thread-lit"
                  d="M0 20 C160 20 200 6 333 20 S520 34 667 20 S860 6 1000 20"
                  pathLength={1}
                />
              </svg>
              <span className="ps-vline" aria-hidden="true" />
              {[
                [
                  "01",
                  "Discover",
                  "We listen first. Together, we understand your business, the friction, and the opportunities worth pursuing.",
                ],
                [
                  "02",
                  "Design",
                  "We shape a practical strategy, establish priorities, and agree on a clear implementation roadmap.",
                ],
                [
                  "03",
                  "Deliver",
                  "We build, test, and implement with your team. Then refine the system as your business evolves.",
                ],
              ].map(([n, title, copy]) => (
                <article key={title}>
                  <span>{n}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="local-interlude">
          <div className="li-stage">
            <div className="fog-seam" aria-hidden="true" />
            <img
              src="/atmosphere/downtown-auburn-1200.webp"
              alt="Historic downtown Auburn in Northern California"
              width="1200"
              height="800"
              loading="lazy"
            />
            <div className="page-width">
              <p className="eyebrow">Rooted in Northern California</p>
              <p>
                We don't build client lists.
                <br />
                <em>We build partnerships.</em>
              </p>
              <span>Auburn · Placer County · Greater Sacramento</span>
            </div>
          </div>
        </section>
        <Contact onBook={() => book("Final invitation")} />
        <SignupBand />
      </main>
      <ActionDock />
      <footer className="atmosphere-footer">
        <FooterFinale />
        <div className="page-width">
          <div className="footer-top">
            <div>
              <p className="footer-tagline">
                Your local business and technology partner.
              </p>
              <p className="footer-place">
                Auburn, California
                <br />
                Placer County · Greater Sacramento
              </p>
            </div>
            <div>
              <span>Explore</span>
              <a href="#capabilities">Capabilities</a>
              <a href="#founder">Our founder</a>
              <a href="#work">Our work</a>
              <a href="#website-check">Free website check</a>
              <a href="#process">Our approach</a>
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
                  book("Footer");
                }}
              >
                Book a 20-minute intro call
              </a>
              <button onClick={() => openSentientChat({ source: "Footer" })}>
                Ask our AI concierge
              </button>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Sentient Partners.</span>
            <span>
              Based in Auburn. Working across Northern California and beyond.
            </span>
            <a href="/privacy.html">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
