import React, { useEffect, useState } from 'react';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { Button } from './Button';
import { Logo } from './Logo';

const NAV_ITEMS = [
  { id: 'services', label: 'Services' },
  { id: 'process', label: 'Process' },
  { id: 'demo', label: 'Demo' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'results', label: 'Results' }, // if you prefer "Testimonials", change id to "testimonials"
  { id: 'faq', label: 'FAQ' },
];

export const Header: React.FC = () => {
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
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileOpen(false);
    }
  };

  const openBooking = () => {
    window.dispatchEvent(new CustomEvent('open-booking-modal'));
    setMobileOpen(false);
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
      {/* Top promo banner */}
      <div className="hidden sm:block text-center text-[11px] tracking-[0.16em] uppercase py-2 bg-slate-100 text-slate-700 dark:bg-slate-900/95 dark:text-slate-100/80">
        LIMITED TIME OFFER · FREE 2ND MONTH · ENDS 12/31/25
      </div>

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
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToId(item.id)}
                className="text-slate-900 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white transition-colors"
              >
                {item.label}
              </button>
            ))}
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
                Book Strategy Call
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
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
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
              Book Strategy Call
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
