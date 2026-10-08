import React, { useEffect } from 'react';
import { EPIC_NAV } from '../../content/epicContent';
import { HOME_CLOSE, HOME_CONTACT, HOME_CTA, HOME_FOUNDER, HOME_META, HOME_PILLARS, HOME_PROCESS } from '../../content/homeContent';
import { bookIntroduction } from '../home/actions';
import { Arrow } from '../home/Arrow';
import { SiteFooter } from '../home/Sections';
import { SiteHeader } from '../home/SiteHeader';
import { Descent } from './Descent';
import { MainStreet } from './MainStreet';

const statement = 'font-editorial font-normal tracking-[-0.024em] text-[clamp(2.5rem,1.2rem+5vw,6.25rem)] leading-[1]';

/** Daylight after the street: the four ways the firm works, set as a ledger. */
const Ways: React.FC = () => (
  <section id="services" aria-labelledby="services-heading" className="sp-section bg-sp-ivory text-sp-navy">
    <div className="sp-shell">
      <h2 id="services-heading" className={`${statement} max-w-[14ch]`}>
        {HOME_PILLARS.heading}
      </h2>
      <ul className="mt-12 border-t border-sp-navy/25 lg:mt-20">
        {HOME_PILLARS.pillars.map((pillar) => (
          <li key={pillar.id} className="group grid gap-x-12 gap-y-3 border-b border-sp-navy/25 py-8 transition-colors duration-500 hover:bg-sp-cream lg:grid-cols-12 lg:py-10">
            <h3 className="font-editorial text-[clamp(1.75rem,1.3rem+1.8vw,3rem)] leading-[1.05] tracking-[-0.018em] lg:col-span-5">{pillar.name}</h3>
            <p className="sp-lede text-sp-ink lg:col-span-4">{pillar.outcome}</p>
            <p className="sp-body text-sp-slate lg:col-span-3">{pillar.scope}</p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

/** The founder, in words only. Employer names stay in the full bio. */
const Founder: React.FC = () => (
  <section id="founder" aria-labelledby="founder-heading" className="sp-section bg-sp-deep text-sp-ivory">
    <div className="sp-shell">
      <h2 id="founder-heading" className={`${statement} max-w-[19ch]`}>
        {HOME_FOUNDER.heading}
      </h2>
      <div className="mt-12 grid gap-10 lg:mt-20 lg:grid-cols-12 lg:gap-12">
        <div className="space-y-5 lg:col-span-5">
          {HOME_FOUNDER.body.map((paragraph) => (
            <p key={paragraph} className="sp-lede text-sp-mist">
              {paragraph}
            </p>
          ))}
        </div>
        <dl className="border-t border-sp-ivory/20 lg:col-span-6 lg:col-start-7">
          {HOME_FOUNDER.points.map((point) => (
            <div key={point.name} className="border-b border-sp-ivory/20 py-6">
              <dt className="font-editorial text-[clamp(1.375rem,1.2rem+0.6vw,1.75rem)] leading-snug text-sp-champagne">{point.name}</dt>
              <dd className="sp-body mt-2 text-sp-mist">{point.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  </section>
);

/** Four steps, in order: the numerals are large because the order is the point. */
const Approach: React.FC = () => (
  <section id="approach" aria-labelledby="approach-heading" className="sp-section bg-sp-ivory text-sp-navy">
    <div className="sp-shell">
      <h2 id="approach-heading" className={`${statement} max-w-[17ch]`}>
        {HOME_PROCESS.heading}
      </h2>
      <ol className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
        {HOME_PROCESS.steps.map((step, index) => (
          <li key={step.name}>
            <span aria-hidden="true" className="block border-b border-sp-navy/25 pb-3 font-editorial text-[clamp(4rem,3rem+4vw,7.5rem)] leading-[0.8] text-sp-champagne-deep">
              {index + 1}
            </span>
            <h3 className="sp-h3 mt-5">{step.name}</h3>
            <p className="sp-body mt-2.5 text-sp-slate">{step.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

/** The close, under the same dusk the film began in. */
const Close: React.FC = () => (
  <section
    id="contact"
    aria-labelledby="contact-heading"
    className="bg-[linear-gradient(to_bottom,#060A1C_0%,#141A4A_55%,#4A3668_82%,#B36A55_100%)] py-[calc(var(--sp-space)*1.4)] text-center text-sp-ivory"
  >
    <div className="sp-shell">
      <h2 id="contact-heading" className={`${statement} mx-auto max-w-[17ch]`}>
        {HOME_CLOSE.heading}
      </h2>
      <p className="sp-lede mx-auto mt-7 max-w-[36rem] text-sp-ivory/90">{HOME_CLOSE.body}</p>
      <button type="button" onClick={() => bookIntroduction('Close')} className="sp-btn sp-btn-champagne mt-9">
        {HOME_CTA.book}
        <Arrow />
      </button>
      <p className="sp-body mt-7 text-sp-ivory/90">
        Or call or text{' '}
        <a href={HOME_CONTACT.phoneHref} className="whitespace-nowrap underline decoration-sp-ivory/50 underline-offset-4 hover:decoration-sp-ivory">
          {HOME_CONTACT.phone}
        </a>
        , or email{' '}
        <a href={`mailto:${HOME_CONTACT.email}`} className="break-words underline decoration-sp-ivory/50 underline-offset-4 hover:decoration-sp-ivory">
          {HOME_CONTACT.email}
        </a>
        .
      </p>
    </div>
  </section>
);

/**
 * The homepage as one descent: from cruising altitude, through the fog, to a
 * lit main street, and then the daylight business of how the firm works.
 */
export const Epic: React.FC = () => {
  useEffect(() => {
    document.title = HOME_META.title;
  }, []);

  return (
    <div className="sp-root min-h-screen bg-[#060A1C] font-ui text-sp-ink selection:bg-sp-champagne selection:text-sp-deep">
      <a
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
        className="sr-only z-[60] rounded-[3px] bg-sp-champagne px-4 py-3 text-sp-deep focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <SiteHeader nav={EPIC_NAV} centered night />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <Descent />
        <MainStreet />
        <Ways />
        <Founder />
        <Approach />
        <Close />
      </main>
      <SiteFooter nav={EPIC_NAV} />
    </div>
  );
};
