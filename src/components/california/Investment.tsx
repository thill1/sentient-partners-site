import React from 'react';
import { CA_CTA, CA_INVESTMENT } from '../../content/californiaContent';
import { openBookingModal } from '../../lib/siteActions';
import { Arrow, CaButton, Reveal } from './primitives';

/**
 * Investment, framed as part of the engagement rather than a price list.
 * Rendered inside the engagement model section; keeps the `pricing` id so
 * Voice Command's "show me investment" still lands here.
 */
export const InvestmentBlock: React.FC = () => (
  <div id="pricing" className="mt-12 grid scroll-mt-24 gap-10 border-t border-ca-ivory/15 pt-10 lg:mt-16 lg:grid-cols-12 lg:gap-12 lg:pt-12">
    <Reveal className="lg:col-span-5">
      <h3 className="ca-h2">
        {CA_INVESTMENT.heading}
      </h3>
      <p className="mt-6 max-w-[30rem] ca-body text-ca-ivory/70">{CA_INVESTMENT.body}</p>
      <CaButton
        tone="onDark"
        className="mt-9"
        onClick={() => openBookingModal({ source: 'California · Investment', ctaLabel: CA_CTA.primary })}
      >
        {CA_CTA.primary} <Arrow />
      </CaButton>
    </Reveal>

    <div className="space-y-12 lg:col-span-6 lg:col-start-7">
      <Reveal delay={100}>
        <p className="text-[14px] text-ca-ivory/60">{CA_INVESTMENT.factorsLabel}</p>
        <ul className="mt-5 grid border-t border-ca-ivory/40 sm:grid-cols-2 sm:gap-x-8">
          {CA_INVESTMENT.factors.map((factor) => (
            <li key={factor} className="border-b border-ca-ivory/10 py-3.5 text-[15px] text-ca-ivory/85">
              {factor}
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  </div>
);
