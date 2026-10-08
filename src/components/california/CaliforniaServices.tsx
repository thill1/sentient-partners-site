import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { CA_PILLARS } from '../../content/californiaContent';
import { SERVICE_CATALOG } from '../../content/siteContent';
import { Reveal } from './primitives';

/**
 * Services as four layers of one system rather than six equal cards.
 * The detailed catalog stays one click away for visitors who want it.
 */
export const CaliforniaServices: React.FC = () => {
  const [catalogOpen, setCatalogOpen] = useState(false);

  return (
    <section id="services" data-ca-tone="dark" aria-labelledby="ca-services-heading" className="bg-ca-deep text-ca-ivory">
      <div className="mx-auto max-w-[1400px] px-5 pb-[clamp(6rem,3.25rem+7.5vw,11rem)] pt-8 sm:px-8 md:pt-12 lg:px-12">
        <Reveal className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <h2
              id="ca-services-heading"
              className="ca-h2"
            >
              {CA_PILLARS.heading}
            </h2>
          </div>
          <p className="max-w-[28rem] ca-lede text-ca-ivory/65 lg:col-span-4 lg:col-start-9 lg:self-end">
            {CA_PILLARS.body}
          </p>
        </Reveal>

        <div aria-hidden="true" className="relative mt-16 h-px lg:mt-20 motion-reduce:hidden">
          <span className="absolute -top-[3px] block h-[7px] w-[7px] animate-ca-travel-x bg-ca-pacific opacity-0 shadow-[0_0_14px_3px_rgba(124,152,184,0.55)]" />
        </div>
        <ol className="grid border-t border-ca-ivory/25 sm:grid-cols-2 lg:grid-cols-4">
          {CA_PILLARS.pillars.map((pillar, i) => (
            <Reveal
              as="li"
              key={pillar.name}
              delay={i * 110}
              className={`border-b border-ca-ivory/10 py-8 sm:pr-6 lg:border-b-0 lg:px-6 lg:py-10 lg:first:pl-0 ${
                i % 2 === 1 ? 'sm:border-l sm:pl-6' : ''
              } ${i > 0 ? 'lg:border-l' : ''} border-l-ca-ivory/10`}
            >
              <h3 className="font-display text-[30px] leading-tight">{pillar.name}</h3>
              <p className="mt-3 ca-body text-ca-ivory/65">{pillar.detail}</p>
              <ul className="mt-6 space-y-2.5 text-[14px] text-ca-ivory/80">
                {pillar.scope.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Reveal>
          ))}
        </ol>

        <div className="mt-12 border-t border-ca-ivory/10 pt-6">
          <button
            type="button"
            onClick={() => setCatalogOpen((open) => !open)}
            aria-expanded={catalogOpen}
            aria-controls="ca-service-catalog"
            className="inline-flex min-h-[44px] items-center gap-3 rounded-sm text-[14px] font-medium text-ca-ivory/80 hover:text-ca-ivory focus:outline-none focus-visible:ring-2 focus-visible:ring-ca-orange"
          >
            {catalogOpen ? <Minus aria-hidden="true" className="h-3.5 w-3.5" /> : <Plus aria-hidden="true" className="h-3.5 w-3.5" />}
            {CA_PILLARS.catalogToggle}
          </button>

          {catalogOpen && (
            <dl id="ca-service-catalog" className="mt-6 grid gap-x-12 md:grid-cols-2">
              {SERVICE_CATALOG.map((service) => (
                <div key={service.id} className="border-t border-ca-ivory/10 py-5">
                  <dt className="font-display text-[20px]">{service.title}</dt>
                  <dd className="mt-2 text-[14px] leading-relaxed text-ca-ivory/60">{service.description}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
};
