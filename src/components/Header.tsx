import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { Logo } from './Logo';
import { Menu, X, Sun, Moon } from 'lucide-react';

const NAV_LINKS = [
  { href: '#services', label: 'Services' },
  { href: '#process', label: 'Process' },
  { href: '#demo', label: 'Demo' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#testimonials', label: 'Results' },
  { href: '#faq', label: 'FAQ' },
];

export const Header: React.FC = () => {
  const [isDark, setIsDark] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Bootstrap theme from localStorage / OS
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('theme');
    const prefersDark =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    const initial = stored === 'dark' || (!stored && prefersDark);
    setIsDark(initial);

    const root = document.documentElement;
    if (initial) root.classList.add('dark');
    else root.classList.remove('dark');
  }, []);

  // Keep <html class="dark"> in sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;

    if (isDark) {
      root.classList.add('dark');
      window.localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      window.localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Track scroll for header blur
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onScroll = () => setIsScrolled(window.scrollY > 10);
    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleBook = () => {
    window.dispatchEvent(new CustomEvent('open-booking-modal'));
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div
        className={
          'transition-colors duration-300 ' +
          (isScrolled
            ? 'bg-slate-950/80 backdrop-blur-xl'
            : 'bg-transparent')
        }
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Promo banner */}
          <div className="pt-2 text-[11px] sm:text-xs font-semibold tracking-[0.18em] uppercase text-center text-slate-100/80 drop-shadow-[0_0_12px_rgba(15,23,42,0.9)]">
            LIMITED TIME OFFER · FREE 2ND MONTH · ENDS 12/31/25
          </div>

          {/* Main nav row */}
          <div className="flex items-center justify-between gap-4 py-2.5 md:py-3">
            {/* Logo + wordmark */}
            <div className="flex items-center gap-3">
              <Logo />
            </div>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-8 text-sm text-slate-100">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center text-slate-200/90 hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Right side controls */}
            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <button
                type="button"
                onClick={() => setIsDark((prev) => !prev)}
                aria-label="Toggle dark mode"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/40 text-slate-100 shadow-md shadow-black/40 hover:bg-white/10 transition"
              >
                {isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              {/* Desktop CTA */}
              <div className="hidden sm:block">
                <Button size="lg" onClick={handleBook}>
                  Book Strategy Call
                </Button>
              </div>

              {/* Mobile menu toggle */}
              <button
                type="button"
                onClick={() => setMobileOpen((open) => !open)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/40 text-slate-100 shadow-md shadow-black/40 hover:bg-white/10 transition md:hidden"
                aria-label="Toggle navigation menu"
              >
                {mobileOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="md:hidden px-4 sm:px-6 lg:px-8 pb-4">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-3xl bg-slate-950/90 border border-white/15 backdrop-blur-xl py-4 px-4 shadow-[0_18px_60px_rgba(15,23,42,0.9)]">
              <nav className="space-y-1">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-2xl px-3 py-2 text-sm text-slate-100 hover:bg-white/5"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              <div className="mt-4">
                <Button className="w-full" size="lg" onClick={handleBook}>
                  Book Strategy Call
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
