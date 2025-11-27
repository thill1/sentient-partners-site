import React, { useEffect, useState } from "react";
import { Sun, Moon, Menu, X } from "lucide-react";
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
  if (stored === "light" || stored === "dark") {
    return stored as Theme;
  }

  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
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
  const [mobileOpen, setMobileOpen] = useState(false);

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
    setMobileOpen(false);
  };

  const openBooking = () => {
    window.dispatchEvent(new CustomEvent("open-booking-modal"));
    setMobileOpen(false);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      {/* Top promo banner – transparent, theme-aware text */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-2 text-[11px] sm:text-xs md:text-sm font-semibold tracking-wide text-sky-900 dark:text-sky-100 drop-shadow-md">
            <span className="uppercase">
              LIMITED TIME OFFER · FREE 2ND MONTH · ENDS 12/31/25
            </span>
          </div>
        </div>
      </div>

      {/* Main navigation – fully transparent container */}
      <div className="px-4 sm:px-6 lg:px-8 pb-2">
        <div className="mx-auto max-w-7xl">
          <nav
            className="mt-1 flex h-16 sm:h-20 items-center justify-between px-2 sm:px-4"
            aria-label="Main navigation"
          >
            {/* Left: Logo only (Logo already includes wordmark/tagline) */}
            <div className="flex items-center gap-3">
              <Logo />
            </div>

            {/* Center: nav links (desktop) */}
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-900 dark:text-slate-100">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => handleNavClick(item.href)}
                  className="transition-colors hover:text-sky-700 dark:hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-full px-1"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right: theme toggle + CTA (desktop) + mobile menu button */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Theme toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle dark mode"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/70 text-slate-100 hover:text-sky-300 hover:bg-slate-800/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              {/* Primary CTA – desktop only (mobile version will be in the slide-down menu) */}
              <div className="hidden sm:block">
                <Button size="lg" onClick={openBooking}>
                  Book Strategy Call
                </Button>
              </div>

              {/* Mobile menu toggle */}
              <button
                type="button"
                className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/70 text-slate-100 hover:text-sky-300 hover:bg-slate-800/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                aria-label="Toggle navigation menu"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((open) => !open)}
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </nav>

          {/* Mobile menu panel */}
          {mobileOpen && (
            <div className="mt-2 md:hidden rounded-2xl bg-slate-900/90 text-slate-50 backdrop-blur-xl border border-white/10 px-4 py-3 space-y-2">
              <div className="flex flex-col gap-2 text-sm font-medium">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => handleNavClick(item.href)}
                    className="w-full text-left py-1.5 px-1 rounded-md hover:text-sky-300 hover:bg-slate-800/70 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="pt-3 border-t border-white/10 mt-2">
                <Button size="lg" className="w-full" onClick={openBooking}>
                  Book Strategy Call
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
