import React from 'react';
import { ArrowRight, PlayCircle, Sparkles } from 'lucide-react';
import { CTA_SECTION_CONTENT } from '../content/siteContent';
import { openBookingModal, scrollToSection } from '../lib/siteActions';

export const CTASection: React.FC = () => {
  const openBooking = () => {
    openBookingModal({ source: 'CTA Section', ctaLabel: 'Book Your Strategy Call' });
  };

  const scrollToDemo = () => {
    scrollToSection('demo');
  };

  return (
    <section
      id="get-started"
      className="relative py-16 sm:py-24 md:py-28"
    >
      {/* Local background glows only (no solid section background) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        {/* Floating glass card */}
        <div className="rounded-3xl bg-white/80 dark:bg-slate-950/75 border border-white/20 dark:border-white/10 backdrop-blur-xl shadow-[0_24px_70px_rgba(15,23,42,0.85)] px-6 py-10 sm:px-10 sm:py-12 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/40 dark:bg-white/5 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 backdrop-blur">
            <Sparkles className="h-3 w-3 text-brand-400" />
            <span>{CTA_SECTION_CONTENT.eyebrow}</span>
          </div>

          {/* Heading */}
          <h2 className="mt-6 font-display text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {CTA_SECTION_CONTENT.heading}
          </h2>

          {/* Subcopy */}
          <p className="mt-5 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            {CTA_SECTION_CONTENT.body}
          </p>

          {/* Product/offer pill */}
          <div className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full border border-brand-400/40 bg-white/60 dark:bg-slate-950/80 px-4 py-2 text-[11px] font-medium text-slate-700 dark:text-slate-200 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>{CTA_SECTION_CONTENT.pill}</span>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={openBooking}
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm sm:text-base font-medium text-white shadow-lg shadow-brand-500/40 transition hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              <ArrowRight className="h-4 w-4" />
              <span>{CTA_SECTION_CONTENT.primaryCta}</span>
            </button>

            <button
              type="button"
              onClick={scrollToDemo}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300/70 dark:border-white/20 bg-white/70 dark:bg-white/5 px-5 py-3 text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 backdrop-blur transition hover:border-brand-400/70 hover:bg-white/90 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              <PlayCircle className="h-5 w-5" />
              <span>{CTA_SECTION_CONTENT.secondaryCta}</span>
            </button>
          </div>

          {/* Micro trust / risk reversal */}
          <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
            {CTA_SECTION_CONTENT.trustCopy}
          </p>
        </div>
      </div>
    </section>
  );
};
