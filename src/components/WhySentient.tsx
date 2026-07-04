import React from 'react';
import { Target, LineChart, Workflow, ShieldCheck } from 'lucide-react';
import { WHY_SENTIENT_CONTENT } from '../content/siteContent';

const CARD_ICONS = [Target, Workflow, LineChart, ShieldCheck] as const;

export const WhySentient: React.FC = () => {
  return (
    <section
      id="why"
      className="relative py-16 sm:py-24 md:py-28"
      aria-labelledby="why-heading"
    >
      {/* Soft ambient glows – no solid band */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-32 top-1/4 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Floating glass card */}
        <div className="rounded-3xl bg-white/80 dark:bg-slate-950/75 border border-white/20 dark:border-white/10 backdrop-blur-xl shadow-[0_24px_70px_rgba(15,23,42,0.85)] px-6 sm:px-10 py-10 sm:py-12">
          {/* Centered heading block */}
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">
              {WHY_SENTIENT_CONTENT.eyebrow}
            </p>
            <h2
              id="why-heading"
              className="mt-3 font-display text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white"
            >
              {WHY_SENTIENT_CONTENT.heading}
            </h2>
          </div>

          {/* Cards row */}
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_SENTIENT_CONTENT.cards.map((card, index) => {
              const Icon = CARD_ICONS[index];
              return (
                <div
                  key={card.title}
                  className="flex flex-col rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-slate-900/50 p-5"
                >
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    {card.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
