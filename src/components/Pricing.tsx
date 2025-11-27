import React from 'react';
import { Button } from './Button';
import { Check, Sparkles } from 'lucide-react';
import { PRICING_PLANS } from '../constants';

export const Pricing: React.FC = () => {
  const openBooking = () => {
    window.dispatchEvent(new CustomEvent('open-booking-modal'));
  };

  const openContact = () => {
    window.dispatchEvent(new CustomEvent('open-contact-modal'));
  };

  return (
    <section
      id="pricing"
      className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto relative">
        {/* Local glow behind the pricing block so beams stay visible */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-900/60 to-transparent dark:from-slate-900/80" />
          <div className="absolute -right-32 top-1/3 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-cyan-500/25 blur-3xl" />
        </div>

        {/* Floating glass panel for pricing */}
        <div className="rounded-3xl bg-white/6 dark:bg-slate-950/75 border border-white/10 backdrop-blur-xl shadow-[0_24px_70px_rgba(15,23,42,0.85)] p-8 sm:p-10">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-brand-600 dark:text-brand-500 font-semibold tracking-wide uppercase text-sm mb-3">
              Pricing Plans
            </h2>
            <h3 className="text-3xl md:text-5xl font-display font-bold text-slate-900 dark:text-white mb-6">
              Invest in Systems,
              <br />
              <span className="text-slate-500 dark:text-slate-400">
                Not Overhead
              </span>
            </h3>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Replace the cost of 3 full-time employees with one intelligent
              system. Simple, transparent pricing with no hidden implementation
              fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {PRICING_PLANS.map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-3xl p-8 transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-slate-900/95 text-white border border-brand-500/70 shadow-2xl shadow-brand-900/40 scale-[1.03] z-10'
                    : 'bg-white/80 dark:bg-slate-950/70 text-slate-900 dark:text-white border border-slate-200/70 dark:border-white/10 hover:bg-white/95 dark:hover:bg-slate-950/90 shadow-md shadow-black/10'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-500 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center shadow-lg shadow-brand-500/40">
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
                      : 'text-slate-600 dark:text-slate-400'
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
                            : 'text-slate-700 dark:text-slate-300'
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
                  onClick={
                    plan.name === 'Enterprise' ? openContact : openBooking
                  }
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Need a custom implementation roadmap?{' '}
              <button
                onClick={openBooking}
                className="text-brand-600 dark:text-brand-400 underline hover:text-brand-500 dark:hover:text-brand-300 font-medium"
              >
                Book a free strategy call
              </button>{' '}
              to discuss your needs.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
