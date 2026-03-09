import React from 'react';
import { TESTIMONIALS } from '../constants';
import { Quote } from 'lucide-react';
import { TESTIMONIALS_SECTION_CONTENT } from '../content/siteContent';

export const Testimonials: React.FC = () => {
  return (
    <section
      id="testimonials"
      className="relative py-24 overflow-hidden"
    >
      {/* Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-brand-600 dark:text-brand-400 font-semibold tracking-wide uppercase text-sm mb-3">
            {TESTIMONIALS_SECTION_CONTENT.eyebrow}
          </h2>
          <h3 className="text-3xl md:text-5xl font-display font-bold mb-6 text-slate-900 dark:text-white">
            {TESTIMONIALS_SECTION_CONTENT.heading}
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {TESTIMONIALS_SECTION_CONTENT.subheading}
          </p>
        </div>

        {/* Testimonial cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="bg-slate-950/80 backdrop-blur-xl border border-white/10 p-8 pt-12 rounded-2xl hover:bg-slate-950 transition-colors duration-300 flex flex-col relative group text-white"
            >
              <div className="absolute top-4 right-4 bg-brand-500 text-white px-3 py-1 rounded-lg text-xs font-bold border border-brand-400/50 whitespace-nowrap shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform duration-300 z-10">
                {t.metric}
              </div>

              <div className="mb-6">
                <Quote className="w-10 h-10 text-brand-500 opacity-60" />
              </div>

              <p className="text-lg text-slate-200 italic mb-8 leading-relaxed flex-grow">
                "{t.quote}"
              </p>

              <div className="border-t border-slate-800/80 pt-6">
                <h4 className="font-bold text-white">{t.author}</h4>
                <p className="text-sm text-slate-400">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
