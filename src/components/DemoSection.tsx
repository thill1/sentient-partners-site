import React from 'react';
import { Sparkles } from 'lucide-react';
import { DEMO_CONTENT } from '../content/siteContent';
import { FrontDeskDemo } from './demo/FrontDeskDemo';

export const DemoSection: React.FC = () => {
  return (
    <section id="demo" className="relative overflow-hidden py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-2xl dark:border-dark-border dark:bg-dark-card md:p-12">
          {/* Glow background */}
          <div className="pointer-events-none absolute left-0 top-0 z-0 h-full w-full overflow-hidden opacity-30">
            <div className="absolute -right-[200px] -top-[200px] h-[500px] w-[500px] rounded-full bg-brand-500/20 blur-[100px]" />
            <div className="absolute -bottom-[200px] -left-[200px] h-[500px] w-[500px] rounded-full bg-brand-700/20 blur-[100px]" />
          </div>

          <div className="relative z-10">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <div className="mb-6 inline-flex items-center space-x-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
                <Sparkles size={16} />
                <span>{DEMO_CONTENT.eyebrow}</span>
              </div>

              <h2 className="mb-4 font-display text-4xl font-semibold text-brand-900 dark:text-white md:text-5xl">
                {DEMO_CONTENT.heading}
              </h2>

              <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                {DEMO_CONTENT.body}
              </p>
            </div>

            <FrontDeskDemo />

            <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {DEMO_CONTENT.helperText}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
