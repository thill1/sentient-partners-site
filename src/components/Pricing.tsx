import React from 'react';
import { Button } from './Button';
import { Check, Sparkles } from 'lucide-react';
import { PRICING_PLANS } from '../constants';
import { PRICING_SECTION_CONTENT } from '../content/siteContent';
import { openBookingModal, openContactModal } from '../lib/siteActions';

export const Pricing: React.FC = () => {
  const openBooking = () => {
    openBookingModal({ source: 'Pricing', ctaLabel: 'Book Strategy Call' });
  };

  const openContact = () => {
    openContactModal({
      intent: 'contact',
      source: 'Pricing',
      ctaLabel: 'Contact Sales',
      inquiry:
        'I would like to discuss an enterprise or custom AI implementation for my business.',
    });
  };

  return (
    <section id="pricing" className="py-14 sm:py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-[11px] font-medium uppercase tracking-brand text-brand-700/90 dark:text-brand-300/90 mb-4">
            {PRICING_SECTION_CONTENT.eyebrow}
          </h2>
          <h3 className="text-3xl md:text-5xl font-display font-semibold text-brand-950 dark:text-white mb-6">
            {PRICING_SECTION_CONTENT.heading}
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            {PRICING_SECTION_CONTENT.subheading}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          {PRICING_PLANS.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-3xl p-8 transition-all duration-300 backdrop-blur-xl ${
                plan.highlight
                  ? 'bg-slate-950/85 text-white shadow-2xl scale-105 border-2 border-brand-500 z-10'
                  : 'bg-white/80 dark:bg-dark-card/90 text-slate-900 dark:text-white border border-slate-200/70 dark:border-dark-border/70 hover:shadow-lg'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-500 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center shadow-lg">
                  <Sparkles className="w-3 h-3 mr-1" /> Most Popular
                </div>
              )}

              <h4
                className={`text-xl font-bold mb-2 ${
                  plan.highlight
                    ? 'text-white'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {plan.name}
              </h4>
              <p
                className={`text-sm mb-6 h-10 ${
                  plan.highlight
                    ? 'text-slate-300'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {plan.description}
              </p>

              <div className="flex items-baseline mb-8">
                <span className="text-4xl font-bold tracking-tight">
                  {plan.price}
                </span>
                <span
                  className={`ml-1 text-sm ${
                    plan.highlight
                      ? 'text-slate-300'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {plan.period}
                </span>
              </div>

              <div className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start">
                    <Check
                      className={`w-5 h-5 mr-3 shrink-0 ${
                        plan.highlight
                          ? 'text-brand-400'
                          : 'text-brand-600 dark:text-brand-500'
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        plan.highlight
                          ? 'text-slate-200'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                variant={plan.highlight ? 'primary' : 'outline'}
                className={`w-full ${
                  plan.highlight ? 'shadow-lg shadow-brand-500/40' : ''
                }`}
                onClick={plan.name === 'Enterprise' ? openContact : openBooking}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Need a custom implementation roadmap?{' '}
            <button
              onClick={openBooking}
              className="text-brand-600 underline hover:text-brand-500"
            >
              Book a free strategy call
            </button>{' '}
            to discuss your needs.
          </p>
        </div>
      </div>
    </section>
  );
};
