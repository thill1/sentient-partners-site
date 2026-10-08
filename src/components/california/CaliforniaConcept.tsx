import React, { useEffect } from 'react';
import { CA_META, CA_REDWOODS, CA_SCENES } from '../../content/californiaContent';
import { AfterHoursDemo } from './AfterHoursDemo';
import { CaliforniaCTA } from './CaliforniaCTA';
import { CaliforniaFooter } from './CaliforniaFooter';
import { CaliforniaHeader } from './CaliforniaHeader';
import { CaliforniaHero } from './CaliforniaHero';
import { ConnectionArchitecture } from './ConnectionArchitecture';
import { EngagementModel } from './EngagementModel';
import { FounderSection } from './FounderSection';
import { LandscapeInterlude } from './LandscapeInterlude';
import { NightRail } from './NightRail';
import { OpportunityMap } from './OpportunityMap';
import { ResponseDiagnosis } from './ResponseDiagnosis';

/**
 * California Intelligence, an isolated homepage concept at /#/california.
 *
 * Promise → problem → demonstration → people → system → engagement.
 * The dusk-to-dawn story supports one next step: an introductory call.
 *
 * Section ids match the production homepage where they overlap (demo,
 * diagnosis, services, process, pricing, faq) so Voice Command
 * navigation keeps working here.
 */
export const CaliforniaConcept: React.FC = () => {
  useEffect(() => {
    const originalTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const originalDescription = description?.content;
    document.title = CA_META.title;
    if (description) description.content = CA_META.description;
    window.scrollTo(0, 0);
    return () => {
      document.title = originalTitle;
      if (description && originalDescription !== undefined) description.content = originalDescription;
    };
  }, []);

  return (
    <div className="ca-root min-h-screen bg-ca-ivory font-sans text-ca-navy antialiased selection:bg-ca-navy selection:text-ca-ivory">
      <a
        href="#ca-main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('ca-main')?.focus();
        }}
        className="sr-only z-[60] rounded-sm bg-ca-navy px-4 py-3 text-ca-ivory focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <CaliforniaHeader />
      <NightRail />
      <main id="ca-main" tabIndex={-1} className="focus:outline-none">
        <CaliforniaHero />
        <ResponseDiagnosis />
        <AfterHoursDemo />
        <FounderSection />
        <ConnectionArchitecture />
        <LandscapeInterlude
          id="redwoods"
          image="redwoods"
          line={CA_REDWOODS.line}
          lineSecond={CA_REDWOODS.lineSecond}
          position="50% 60%"
          caption={CA_SCENES.redwoods}
        />
        <OpportunityMap />
        <EngagementModel />
        <CaliforniaCTA />
      </main>
      <CaliforniaFooter />
    </div>
  );
};
