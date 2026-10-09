import React, { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { HOME_CTA, HOME_NAV } from '../../content/homeContent';
import { bookIntroduction, goToSection } from './actions';
import { Wordmark } from './Wordmark';

/**
 * Clear over the hero photograph, ivory once the page scrolls. Below the lg
 * breakpoint the section links move into a full-screen menu.
 */
interface SiteHeaderProps {
  nav?: readonly { id: string; label: string }[];
  /** Sections at the left, the wordmark in the middle, booking at the right. */
  centered?: boolean;
  /** Stay dark once the page scrolls, for a page that is mostly night. */
  night?: boolean;
}

export const SiteHeader: React.FC<SiteHeaderProps> = ({ nav = HOME_NAV, centered = false, night = false }) => {
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu || !menuOpen) return;
    menu.showModal();
    return () => menu.close();
  }, [menuOpen]);

  const tone = solid && !night ? 'dark' : 'light';
  const linkTone = solid && !night
    ? 'text-sp-navy/85 hover:text-sp-navy'
    : 'text-sp-ivory [text-shadow:0_1px_12px_rgba(8,20,51,0.55)] hover:text-white';

  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 transition-[background-color,box-shadow] duration-300 ${
        solid
          ? night
            ? 'bg-[#060A1C]/[0.94] shadow-[0_1px_0_rgba(247,245,240,0.12)] backdrop-blur-md'
            : 'bg-sp-ivory/95 shadow-[0_1px_0_rgba(13,31,78,0.1)] backdrop-blur-md'
          : 'bg-transparent'
      }`}
    >
      <div
        className={`sp-shell flex h-[76px] items-center justify-between gap-6 max-[359px]:gap-3 lg:h-[84px] ${
          centered ? 'lg:grid lg:grid-cols-[1fr_auto_1fr]' : ''
        }`}
      >
        <a
          href="#top"
          onClick={(event) => goToSection(event, 'top')}
          aria-label="Sentient Partners, back to top"
          className={centered ? 'lg:order-2' : ''}
        >
          <Wordmark tone={tone} />
        </a>

        <nav aria-label="Sections" className={`hidden lg:block ${centered ? 'lg:order-1 sp-hero-aligned-nav' : ''}`}>
          <ul className={`flex items-center ${centered ? 'gap-6 xl:gap-8' : 'gap-7 xl:gap-10'}`}>
            {nav.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(event) => goToSection(event, item.id)}
                  className={`font-medium transition-colors ${centered ? 'text-[15px]' : 'text-[16px]'} ${linkTone}`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={`flex items-center gap-2 ${centered ? 'lg:order-3 lg:justify-self-end' : ''}`}>
          <button
            type="button"
            onClick={() => bookIntroduction('Header')}
            className={`sp-btn hidden min-h-[2.75rem] px-5 py-2 text-[15px] sm:inline-flex ${solid && !night ? 'sp-btn-navy' : 'sp-btn-champagne'}`}
          >
            {HOME_CTA.book}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-[3px] lg:hidden ${
              solid && !night ? 'text-sp-navy' : 'text-sp-ivory'
            }`}
          >
            <Menu aria-hidden="true" className="h-6 w-6" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <dialog
          ref={menuRef}
          aria-label="Menu"
          onClose={() => setMenuOpen(false)}
          className="sp-root fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none bg-sp-deep p-0 font-ui text-sp-ivory backdrop:bg-sp-deep"
        >
          <div className="sp-shell flex h-full flex-col">
            <div className="flex h-[76px] shrink-0 items-center justify-between">
              <Wordmark tone="light" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-[3px]"
              >
                <X aria-hidden="true" className="h-6 w-6" strokeWidth={1.5} />
              </button>
            </div>
            <nav aria-label="Sections" className="mt-8 flex-1">
              <ul className="divide-y divide-sp-ivory/15 border-y border-sp-ivory/15">
                {nav.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      onClick={(event) => {
                        setMenuOpen(false);
                        // Let the dialog close before the page scrolls beneath it.
                        window.setTimeout(() => goToSection({ preventDefault: () => undefined }, item.id), 0);
                        event.preventDefault();
                      }}
                      className="sp-h3 block py-4"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                window.setTimeout(() => bookIntroduction('Menu'), 0);
              }}
              className="sp-btn sp-btn-champagne mb-8 w-full"
            >
              {HOME_CTA.book}
            </button>
          </div>
        </dialog>
      )}
    </header>
  );
};
