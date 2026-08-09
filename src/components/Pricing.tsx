import React from 'react';
import { Button } from './Button';
import { PRICING_SECTION_CONTENT } from '../content/siteContent';
import { openBookingModal } from '../lib/siteActions';

export const Pricing: React.FC = () => {
  const openBooking = () => {
    openBookingModal({ source: 'Pricing', ctaLabel: 'Book Strategy Call' });
  };

  return (
    <section id="pricing" className="py-14 sm:py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-[11px] font-medium uppercase tracking-brand text-brand-700/90 dark:text-brand-300/90 mb-4">
            {PRICING_SECTION_CONTENT.eyebrow}
          </h2>
          <h3 className="text-3xl md:text-5xl font-display font-semibold text-brand-950 dark:text-white mb-6">
            {PRICING_SECTION_CONTENT.heading}
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
            {PRICING_SECTION_CONTENT.subheading}
          </p>
          <p className="text-base text-slate-500 dark:text-slate-400 mb-10">
            {PRICING_SECTION_CONTENT.body}
          </p>
          <Button variant="primary" size="lg" onClick={openBooking}>
            {PRICING_SECTION_CONTENT.ctaLabel}
          </Button>
        </div>
      </div>
    </section>
  );
};
