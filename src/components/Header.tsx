import React, { useEffect, useState } from 'react';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { Button } from './Button';
import { Logo } from './Logo';

const NAV_ITEMS = [
  { id: 'services', label: 'Services' },
  { id: 'process', label: 'Process' },
  { id: 'demo', label: 'Demo' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'results', label: 'Results' },
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

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/10 shadow-[0_10px_40px_rgba(15,23,42,0.8)]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      {/* Top promo banner */}
      <div className="hidden sm:block text-center text-[11px] tracking-[0.16em] uppercase py-2 text-slate-100/80">
        LIMITED TIME OFFER · FREE 2ND MONTH · ENDS 12/31/25
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main nav row */}
        <div className="flex items-center justify-between py-3 sm:py-4 gap-4">
          {/* Logo + wordmark */}
          <button
            type="button"
            className="flex items-center gap-3 shrink-0"
            onClick={() => scrollToId('main-content')}
          >
            <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-xl border border-cyan-400/50 shadow-[0_0_30px_rgba(56,189,248,0.45)] grid place-items-center">
              <Logo />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-semibold text-white">
                Sentient Partners
              </div>
              <div className="text-[11px] tracking-[0.2em] uppercase text-slate-300">
                AI · Automations · Always-on Revenue
              </div>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToId(item.id)}
                className="text-slate-200 hover:text-white transition-colors"
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/30 backdrop-blur-md text-slate-100 hover:bg-white/10 transition"
              aria-label="Toggle color mode"
            >
              {dark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
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
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/30 backdrop-blur-md text-slate-100 hover:bg-white/10 transition"
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
        <div className="md:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-4 pb-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToId(item.id)}
                className="block w-full text-left px-2 py-2 text-sm text-slate-100 hover:bg-white/5 rounded-lg"
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
