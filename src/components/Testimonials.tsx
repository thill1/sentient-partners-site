import React from 'react';
import { TESTIMONIALS } from '../constants';
import { Quote } from 'lucide-react';

export const Testimonials: React.FC = () => {
  return (
    <section
      id="testimonials"
      className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      <div className="relative max-w-7xl mx-auto">
        {/* Local glow behind the testimonials card (beams stay visible behind) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-900/60 to-transparent dark:from-slate-900/80" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600/25 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/25 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>

        {/* Floating glass panel */}
        <div className="rounded-3xl bg-white/6 dark:bg-slate-950/75 border border-white/10 backdrop-blur-xl shadow-[0_24px_70px_rgba(15,23,42,0.85)] p-8 sm:p-10 text-slate-900 dark:text-white">
          <div className="text-center mb-16">
            <h2 className="text-brand-600 dark:text-brand-400 font-semibold tracking-wide uppercase text-sm mb-3">
              Client Results
            </h2>
            <h3 className="text-3xl md:text-5xl font-display font-bold mb-6">
              Real Impact. Real Revenue.
            </h3>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Join the businesses that have automated their growth with Sentient Partners.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="bg-white/70 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 p-8 pt-12 rounded-2xl hover:bg-white/90 dark:hover:bg-white/10 transition-colors duration-300 flex flex-col relative group shadow-md shadow-black/10 dark:shadow-black/40"
              >
                {/* Metric pill */}
                <div className="absolute top-4 right-4 bg-brand-500 text-white px-3 py-1 rounded-lg text-xs font-bold border border-brand-400/50 whitespace-nowrap shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform duration-300 z-10">
                  {t.metric}
                </div>

                <div className="mb-6">
                  <Quote className="w-10 h-10 text-brand-500 opacity-60" />
                </div>

                <p className="text-lg text-slate-700 dark:text-slate-300 italic mb-8 leading-relaxed flex-grow">
                  "{t.quote}"
                </p>

                <div className="border-t border-slate-200/70 dark:border-white/10 pt-6">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    {t.author}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
