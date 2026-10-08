import React, { useEffect } from 'react';
import { FLAGSHIP_NAV } from '../../content/flagshipContent';
import { HOME_CONTACT, HOME_INTRO, HOME_META } from '../../content/homeContent';
import { AuburnSection, CloseSection, FounderSection, SiteFooter } from '../home/Sections';
import { SiteHeader } from '../home/SiteHeader';
import { MainStreetDay } from './MainStreetDay';
import { Opening } from './Opening';
import { Rings } from './Rings';
import { Span } from './Span';

/** The firm in two sentences, set large, where the fog gives way to the page. */
const Thesis: React.FC = () => (
  <section aria-labelledby="thesis-heading" className="sp-section bg-sp-ivory">
    <div className="sp-shell">
      <h2
        id="thesis-heading"
        className="font-editorial text-[clamp(2.375rem,1.2rem+4.6vw,5.75rem)] leading-[1.02] tracking-[-0.024em] text-sp-navy"
      >
        {HOME_INTRO.heading.split('. ').map((sentence, index, all) => (
          <span key={sentence} className="block">
            {sentence}
            {index < all.length - 1 ? '.' : ''}
          </span>
        ))}
      </h2>
      <div className="mt-10 grid gap-8 border-t border-sp-navy/20 pt-8 lg:mt-14 lg:grid-cols-12 lg:gap-12 lg:pt-10">
        <p className="text-[14px] uppercase tracking-[0.22em] text-sp-bronze lg:col-span-4">{HOME_CONTACT.signature.join('  |  ')}</p>
        {HOME_INTRO.body.map((paragraph) => (
          <p key={paragraph} className="sp-lede text-sp-ink lg:col-span-4">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  </section>
);

/**
 * The flagship homepage: from the Gate to Main Street.
 *
 * Fog clears over the bridge → the firm's thesis → the founder among the
 * redwoods → four ways of working as growth rings → Auburn → one day at a
 * fictional Main Street business → the approach as a span → one next step.
 */
export const Flagship: React.FC = () => {
  useEffect(() => {
    document.title = HOME_META.title;
  }, []);

  return (
    <div className="sp-root min-h-screen bg-sp-ivory font-ui text-sp-ink selection:bg-sp-navy selection:text-sp-ivory">
      <a
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
        className="sr-only z-[60] rounded-[3px] bg-sp-navy px-4 py-3 text-sp-ivory focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <SiteHeader nav={FLAGSHIP_NAV} />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <Opening />
        <Thesis />
        <FounderSection />
        <Rings />
        <AuburnSection />
        <MainStreetDay />
        <Span />
        <CloseSection />
      </main>
      <SiteFooter nav={FLAGSHIP_NAV} />
    </div>
  );
};
