import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "./Button";

type Theme = "light" | "dark";

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "Services", href: "#services" },
  { label: "Process", href: "#process" },
  { label: "Demo", href: "#demo" },
  { label: "Pricing", href: "#pricing" },
  { label: "Results", href: "#results" },
  { label: "FAQ", href: "#faq" },
];

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const applyThemeToDocument = (theme: Theme) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

export const Header: React.FC = () => {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyThemeToDocument(initial);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyThemeToDocument(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme", next);
    }
  };

  const handleNavClick = (href: string) => {
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const openBooking = () => {
    // Keep behavior consistent with Pricing / other CTAs
    window.dispatchEvent(new CustomEvent("open-booking-modal"));
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      {/* Top promo banner – now fully transparent so the hero background reaches the very top */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-2 text-[11px] sm:text-xs md:text-sm font-semibold tracking-wide text-sky-100 drop-shadow-lg">
            <span className="uppercase">
              LIMITED TIME OFFER · FREE 2ND MONTH · ENDS 12/31/25
            </span>
          </div>
        </div>
      </div>

      {/* Main navigation bar – translucent pill, no full-width borders/lines */}
      <div className="px-4 sm:px-6 lg:px-8 pb-2">
        <div className="mx-auto max-w-7xl">
          <nav
            className="
              mt-1
              flex
              h-16 sm:h-20
              items-center
              justify-between
              rounded-full
              bg-gradient-to-r from-slate-900/60 via-sky-900/60 to-slate-900/60
              backdrop-blur-xl
              px-4 sm:px-6
              shadow-[0_18px_45px_rgba(15,23,42,0.75)]
            "
            aria-label="Main navigation"
          >
            {/* Left: logo + wordmark */}
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <Logo />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-display text-sm sm:text-base font-semibold text-slate-50">
                  Sentient Partners
                </span>
                <span className="text-[11px] tracking-[0.18em] uppercase text-slate-300">
                  AI · Automations · Always-On Revenue
                </span>
              </div>
            </div>

            {/* Center: nav links (desktop) */}
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-100">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className="relative transition-colors hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900/60 rounded-full px-1"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right: theme toggle + CTA */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle dark mode"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/40 text-slate-200 hover:text-sky-300 hover:bg-slate-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900/60"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              <div className="hidden sm:block">
                <Button size="lg" onClick={openBooking}>
                  Book Strategy Call
                </Button>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
