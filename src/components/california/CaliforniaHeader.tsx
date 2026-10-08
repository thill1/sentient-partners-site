import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import spMonogramNavy from '../../assets/sp-monogram-navy.png';
import spMonogramWhite from '../../assets/sp-monogram-white.png';
import { CA_CTA, CA_NAV } from '../../content/californiaContent';
import { openBookingModal, scrollToSection } from '../../lib/siteActions';

/**
 * Transparent over the hero, then an ivory or navy bar matching the section
 * beneath it (sections opt in with data-ca-tone="dark"). Navigation uses buttons,
 * not #hash links, a hash change would leave the /#/california route. The link
 * for the part of the page being read is marked.
 */
export const CaliforniaHeader: React.FC = () => {
  // clear: over the hero; light: ivory bar; dark: navy bar over dark sections
  const [tone, setTone] = useState<'clear' | 'light' | 'dark'>('clear');
  const [menuOpen, setMenuOpen] = useState(false);
  /** The navigation entry whose section the reader has most recently reached. */
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      // A section is "reached" once its top is in the upper part of the screen.
      const line = window.innerHeight * 0.4;
      let reached: string | null = null;
      for (const item of CA_NAV) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= line) reached = item.id;
      }
      setCurrent(reached);
      if (window.scrollY < window.innerHeight * 0.6) {
        setTone('clear');
        return;
      }
      const probe = 72; // header height
      const dark = Array.from(document.querySelectorAll<HTMLElement>('[data-ca-tone="dark"]')).some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= probe && r.bottom > probe;
      });
      setTone(dark ? 'dark' : 'light');
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const go = (id: string) => {
    // Release the menu's scroll lock before scrolling, not after the next render.
    document.body.style.overflow = '';
    setMenuOpen(false);
    scrollToSection(id);
  };

  const openCall = () => {
    setMenuOpen(false);
    openBookingModal({ source: 'California · Header', ctaLabel: CA_CTA.primary });
  };

  const light = tone === 'light' || menuOpen;
  const bar = menuOpen || tone === 'light'
    ? 'border-b border-ca-navy/10 bg-ca-ivory/95 backdrop-blur-md'
    : tone === 'dark'
    ? 'border-b border-ca-ivory/10 bg-ca-deep/90 backdrop-blur-md'
    : 'border-b border-transparent bg-transparent';

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${bar}`}>
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between gap-6 px-5 sm:px-8 lg:px-12">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex min-h-[44px] items-center gap-3 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ca-orange"
          aria-label="Sentient Partners, back to top"
        >
          <img src={light ? spMonogramNavy : spMonogramWhite} alt="" className="h-9 w-9 object-contain" />
          <span
            className={`font-display text-[19px] font-semibold tracking-tight transition-colors ${
              light ? 'text-ca-navy' : 'text-ca-ivory'
            }`}
          >
            Sentient Partners
          </span>
        </button>

        <nav aria-label="Concept sections" className="hidden items-center gap-9 lg:flex">
          {CA_NAV.map((item) => {
            const active = current === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                aria-current={active ? 'true' : undefined}
                className={`relative rounded-sm py-2 text-[14px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ca-orange ${
                  light
                    ? active
                      ? 'text-ca-navy'
                      : 'text-ca-navy/70 hover:text-ca-navy'
                    : active
                      ? 'text-ca-ivory'
                      : 'text-ca-ivory/75 hover:text-ca-ivory'
                }`}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 bottom-0 h-px origin-left bg-ca-orange transition-transform duration-500 motion-reduce:transition-none ${
                    active ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCall}
            className={`hidden min-h-[44px] items-center rounded-[2px] px-5 text-[14px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ca-orange sm:inline-flex ${
              light
                ? 'bg-ca-navy text-ca-ivory hover:bg-ca-deep'
                : tone === 'dark'
                ? 'bg-ca-ivory text-ca-navy hover:bg-white'
                : 'border border-ca-ivory/40 text-ca-ivory hover:border-ca-ivory hover:bg-ca-ivory/10'
            }`}
          >
            {CA_CTA.primary}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="ca-mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ca-orange lg:hidden ${
              light ? 'text-ca-navy' : 'text-ca-ivory'
            }`}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="ca-mobile-menu"
          className="h-[calc(100svh-72px)] overflow-y-auto border-t border-ca-navy/10 bg-ca-ivory px-5 pb-10 pt-6 sm:px-8 lg:hidden"
        >
          <nav aria-label="Concept sections" className="flex flex-col">
            {CA_NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                aria-current={current === item.id ? 'true' : undefined}
                className={`border-b py-5 text-left font-display text-[28px] text-ca-navy focus:outline-none focus-visible:underline ${
                  current === item.id ? 'border-ca-orange' : 'border-ca-navy/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={openCall}
            className="mt-8 inline-flex min-h-[52px] w-full items-center justify-center rounded-[2px] bg-ca-navy px-6 text-[15px] font-medium text-ca-ivory"
          >
            {CA_CTA.primary}
          </button>
        </div>
      )}
    </header>
  );
};
