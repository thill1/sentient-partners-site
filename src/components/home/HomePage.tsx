import React, { useEffect } from 'react';
import { HOME_META } from '../../content/homeContent';
import { CapabilitiesSection } from './CapabilitiesSection';
import { HeroSection } from './HeroSection';
import {
  AuburnSection,
  CloseSection,
  FounderSection,
  IntroSection,
  PillarsSection,
  ProcessSection,
  SiteFooter,
} from './Sections';
import { SiteHeader } from './SiteHeader';

/**
 * The homepage: Global Experience. Local Impact.
 *
 * Outcome → firm → capabilities → services → founder → local roots →
 * approach → one next step. Booking, contact and the Concierge are the
 * shared components mounted in App.
 */
export const HomePage: React.FC = () => {
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
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <HeroSection />
        <IntroSection />
        <CapabilitiesSection />
        <PillarsSection />
        <FounderSection />
        <AuburnSection />
        <ProcessSection />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
};
