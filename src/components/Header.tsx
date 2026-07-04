import React, { useEffect, useState } from 'react';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { Button } from './Button';
import { Logo } from './Logo';
import { HEADER_CONTENT, NAV_LINKS } from '../content/siteContent';

function useScrollSpy(ids: readonly string[]): string {
  const [active, setActive] = React.useState('');
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-35% 0px -55% 0px' }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}
import { openBookingModal, scrollToSection } from '../lib/siteActions';
import type { BannerDisplayState } from '../types';

interface HeaderProps {
  banner: BannerDisplayState;
}

const bannerVariantClasses: Record<BannerDisplayState['variant'], string> = {
  info: 'bg-slate-100 text-slate-700 dark:bg-slate-900/95 dark:text-slate-100/80',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-200',
  warning: 'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200',
};

export const Header: React.FC<HeaderProps> = ({ banner }) => {
  const activeSection = useScrollSpy(NAV_LINKS.map((l) => l.id));
  const [dark, setDark] = useState<boolean>(() =>
    document.documentElement.classList.contains('dark'),
  );
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Scroll listener for glass effect
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Theme toggle
  const toggleTheme = () => {
    const root = document.documentElement;
    const nextDark = !dark;
    setDark(nextDark);
    if (nextDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const scrollToId = (id: string) => {
    scrollToSection(id);
    setMobileOpen(false);
  };

  const openBooking = () => {
    openBookingModal({ source: 'Header', ctaLabel: 'Book Strategy Call' });
    setMobileOpen(false);
  };

  const openBannerCta = () => {
    if (!banner.ctaUrl) {
      return;
    }

    if (banner.ctaUrl.startsWith('#')) {
      scrollToSection(banner.ctaUrl.slice(1));
      return;
    }

    window.location.assign(banner.ctaUrl);
  };

  const baseHeaderClasses =
    'fixed inset-x-0 top-0 z-40 transition-all duration-300';

  const headerStateClasses = scrolled
    ? dark
      ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/10 shadow-[0_10px_40px_rgba(15,23,42,0.8)]'
      : 'bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.12)]'
    : dark
    ? 'bg-transparent border-b border-transparent'
    : 'bg-white/60 backdrop-blur-sm border-b border-transparent';

  return (
    <header className={`${baseHeaderClasses} ${headerStateClasses}`}>
      {banner.visible ? (
        <div
          className={`hidden sm:block border-b border-black/5 px-4 py-2 text-center text-[11px] uppercase tracking-[0.16em] ${bannerVariantClasses[banner.variant]}`}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-3">
            <span>{banner.message}</span>
            {banner.ctaText ? (
              <button
                type="button"
                onClick={openBannerCta}
                className="rounded-full border border-current/20 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] transition hover:bg-black/5 dark:hover:bg-white/10"
              >
                {banner.ctaText}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main nav row */}
        <div className="flex items-center justify-between py-3 sm:py-4 gap-4">
          {/* Brand: use Logo component as the single lockup (no extra text) */}
          <button
            type="button"
            className="shrink-0 flex items-center"
            onClick={() => scrollToId('main-content')}
            aria-label="Back to top"
          >
            <Logo />
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm">
            {NAV_LINKS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => scrollToId(item.id)}
                  className={`relative pb-0.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors ${
                    isActive
                      ? 'text-brand-950 dark:text-white'
                      : 'text-slate-600 hover:text-brand-950 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                  {item.id === 'demo' && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-2.5 top-0 h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={`absolute -bottom-0.5 left-0 right-0 h-px bg-brand-900 dark:bg-white origin-left transition-transform duration-300 ${
                      isActive ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          {/* Right-side controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-900 hover:bg-slate-100 shadow-sm transition dark:border-white/15 dark:bg-black/30 dark:text-slate-100 dark:hover:bg-white/10"
              aria-label="Toggle color mode"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Desktop CTA */}
            <div className="hidden md:block">
              <Button size="md" onClick={openBooking}>
                {HEADER_CONTENT.bookingCtaLabel}
              </Button>
            </div>

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-900 hover:bg-slate-100 shadow-sm transition dark:border-white/15 dark:bg-black/30 dark:text-slate-100 dark:hover:bg-white/10"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile slide-down menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white/95 border-slate-200/80 backdrop-blur-2xl dark:bg-slate-950/95 dark:border-white/10">
          <div className="max-w-7xl mx-auto px-4 pb-4 space-y-1">
            {NAV_LINKS.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => scrollToId(item.id)}
                className="block w-full text-left px-2 py-2 text-sm text-slate-900 hover:bg-slate-100 rounded-lg dark:text-slate-100 dark:hover:bg-white/5"
              >
                {item.label}
              </button>
            ))}
            <Button
              size="md"
              className="w-full mt-2"
              onClick={openBooking}
            >
              {HEADER_CONTENT.bookingCtaLabel}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
