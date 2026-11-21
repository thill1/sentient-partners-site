import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { HEADER_CTA, HEADER_ITEMS, hrefOnPage } from "../../content/siteNav";
import { loadFabric } from "../../fabric/motion";
import { bookIntroCall } from "./bookIntroCall";
import MobileMenu, { MOBILE_NAVIGATION_ID } from "./MobileMenu";
import SolutionsMenu from "./SolutionsMenu";
import "./site-nav.css";

export interface SiteHeaderProps {
  /** True on the homepage, where section links stay in-page ("#work" rather than "/#work"). */
  isHome: boolean;
  /** False when the build has no published Insights (see insights/lib.mjs); hides the Insights link. */
  insightsLive?: boolean;
}

/**
 * The site header: desktop navigation with the flat Solutions panel, brand,
 * booking call to action and the full-height mobile menu. Every item comes
 * from the shared nav data (src/content/siteNav), which the Insights build
 * reads too, so the two cannot drift.
 */
export default function SiteHeader({
  isHome,
  insightsLive = __INSIGHTS_LIVE__,
}: SiteHeaderProps) {
  const items = HEADER_ITEMS.filter(
    (item) => insightsLive || !item.requiresInsights,
  );
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
        `.site-header .menu-toggle, #${MOBILE_NAVIGATION_ID} a`,
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
          {items.map((item) =>
            item.panel === "solutions" ? (
              <SolutionsMenu key={item.id} item={item} isHome={isHome} />
            ) : (
              <a key={item.id} href={hrefOnPage(item.href, isHome)}>
                {item.label}
              </a>
            ),
          )}
        </nav>
        <a className="brand-lockup" href={hrefOnPage("/#top", isHome)}>
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
        <a
          className="header-book"
          href={HEADER_CTA.href}
          onClick={(e) => {
            e.preventDefault();
            bookIntroCall("Navigation");
          }}
        >
          {HEADER_CTA.label} <ArrowRight size={15} aria-hidden="true" />
        </a>
        <button
          ref={menuButton}
          className="menu-toggle"
          aria-label={menu ? "Close navigation" : "Open navigation"}
          aria-expanded={menu}
          aria-controls={MOBILE_NAVIGATION_ID}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </div>
      {/* Portaled to <body>: the scrolled header's backdrop-filter makes it the
          containing block for fixed children, which clipped the panel. */}
      {menu &&
        createPortal(
          <MobileMenu
            isHome={isHome}
            insightsLive={insightsLive}
            onNavigate={() => setMenu(false)}
            onBook={() => {
              setMenu(false);
              bookIntroCall("Mobile menu");
            }}
          />,
          document.body,
        )}
    </header>
  );
}
