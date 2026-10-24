import { MobileMore } from "./MobileMore";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ArrowUpRight, Menu, Phone, X } from "lucide-react";
import type { BannerDisplayState } from "../../types";
import { BOOKING_URL, BRAND } from "../../content/siteContent";
import {
  openBookingModal,
  openSentientChat,
} from "../../lib/siteActions";
import { GoldenGate } from "./GoldenGate";
import { Capabilities } from "./Capabilities";
import "./atmosphere.css";
import "./cohesion.css";
import { useScrollReveal } from "./useScrollReveal";
import Outcomes from "./Outcomes";
import Contact from "./Contact";
import {
  useFounderMotion,
  useAuburnMotion,
  useProcessMotion,
  useWorkMotion,
} from "./sectionMotion";
import FooterFinale from "./FooterFinale";
import SignupBand from "./SignupBand";
import SiteCheck from "./SiteCheck";
import { RelayShowcase } from "./RelayShowcase";
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
        src="/atmosphere/sp-monogram-white-72.png"
        alt=""
        width="44"
        height="72"
      />
      <img
        className="monogram-ink"
        src="/atmosphere/sp-monogram-navy-72.png"
        alt=""
        width="44"
        height="72"
      />
      <span>Sentient Partners</span>
    </a>
  );
}
const links = [
  ["How we help", "#services"],
  ["Capabilities", "#capabilities"],
  ["Our work", "#work"],
  ["Our founder", "#founder"],
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
              Book a 20-minute intro call{" "}
              <ArrowRight size={18} aria-hidden="true" />
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

/* A quiet dock keeps the next steps in reach: Book a call, Ask Sentient and
   Call, as a bottom bar on phones and a floating group on desktop. It steps
   aside near the contact finale. */
function ActionDock() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const finale = document.querySelector("#contact");
    const footer = document.querySelector(".atmosphere-footer");
    // On desktop the pinned Capabilities panel puts its own action where the
    // floating pill sits, so the dock steps aside there too.
    const showcase = matchMedia("(min-width: 851px)").matches
      ? document.querySelector("#capabilities")
      : null;
    // Visible from first paint: the hero no longer has its own CTA row, so
    // the same bar serves the whole page with no swap when scrolling.
    const pastHero = true;
    let nearEnd = false;
    const sync = () => setShown(pastHero && !nearEnd);
    sync();
    const visible = new Set<Element>();
    const endObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) =>
        entry.isIntersecting
          ? visible.add(entry.target)
          : visible.delete(entry.target),
      );
      nearEnd = visible.size > 0;
      sync();
    });
    [finale, footer, showcase].forEach((el) => el && endObserver.observe(el));
    return () => {
      endObserver.disconnect();
    };
  }, []);
  return (
    <div
      className={`action-dock ${shown ? "is-shown" : ""}`}
      aria-hidden={!shown}
    >
      <a
        className="dock-book"
        href={BOOKING_URL}
        aria-label="Book a call: a 20-minute introductory call"
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
        <img
          src="/atmosphere/sp-monogram-white-72.png"
          alt=""
          width="12"
          height="20"
        />
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
function WorkSection() {
  return (
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
          <p className="m-trim">
            Calls, schedules, crews and invoices, kept moving.
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
              Field apps that connect scheduling, job details and invoicing.
            </p>
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
            <p>Websites and estimating tools that make the next step clear.</p>
          </article>
        </div>
        <p className="work-disclosure">
          Illustrations of the kinds of systems we build.
        </p>
        <RelayShowcase />
      </div>
    </section>
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
        {/* Flow: promise (hero) → how we help → what it looks like →
            proof → who → how we work → the call. */}
        <GoldenGate />
        <Outcomes />
        <Capabilities />
        <WorkSection />
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
              <p className="eyebrow">Our founder</p>
              <h2>
                Enterprise experience.
                <br />
                <em>Personal accountability.</em>
              </h2>
              <p className="lead-copy">
                After senior executive leadership roles at Hewlett-Packard and
                E*TRADE Financial, Troy Hill founded Sentient Partners to bring
                that discipline to growing businesses.
              </p>
              <MobileMore label="Read Troy's full background">
                <p>
                  Troy spent more than a decade at E*TRADE, rising from the
                  global trading desk to Director of Enterprise Quality
                  Assurance. His team stood behind every E*TRADE product release
                  from 2006 to 2011, and he led the technology integration of
                  the $2.3B Harris Direct and BrownCo acquisitions.
                </p>
                <p>
                  At Hewlett-Packard he became Global Quality Director, running
                  quality operations across 178 countries and leading the
                  migration of more than 12,000 applications. He founded the
                  software-quality consultancy Qualitonomy in 2016, then
                  Sentient Partners, to bring the same discipline to the
                  businesses in his own community.
                </p>
              </MobileMore>
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
                  Book a 20-minute intro call{" "}
                  <ArrowRight size={16} aria-hidden="true" />
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
                No hand-offs. The person on your first call builds your system.
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
                  "We learn your business, where it sticks, and what's worth fixing first.",
                ],
                [
                  "02",
                  "Design",
                  "A practical strategy, clear priorities, and a roadmap we agree on.",
                ],
                [
                  "03",
                  "Deliver",
                  "We build, test and launch with your team, then refine as you grow.",
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
        <SiteCheck />
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
              <a href="#services">How we help</a>
              <a href="#capabilities">Capabilities</a>
              <a href="#work">Our work</a>
              <a href="#founder">Our founder</a>
              <a href="#process">Our approach</a>
              <a href="#website-check">Free website check</a>
              {__INSIGHTS_LIVE__ && <a href="/insights/">Insights</a>}
            </div>
            <div>
              <span>Let's connect</span>
              <a href={BRAND.phoneHref}>{BRAND.phone}</a>
              <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
              <a
                href={BRAND.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
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
                Ask Sentient (chat or voice)
              </button>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Sentient Partners.</span>
            <a href="/privacy.html">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
