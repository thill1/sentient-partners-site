import React from 'react';
import { ArrowRight, PlayCircle, Sparkles } from 'lucide-react';

export const CTASection: React.FC = () => {
  const openBooking = () => {
    window.dispatchEvent(new CustomEvent('open-booking-modal'));
  };

  const scrollToDemo = () => {
    const el = document.getElementById('demo');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section
      id="get-started"
      className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-24 sm:py-28"
    >
      {/* Background glows */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur">
          <Sparkles className="h-3 w-3 text-brand-300" />
          <span>Ready to Get Started?</span>
        </div>

        {/* Heading */}
        <h2 className="mt-6 font-display text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white">
          Ready to Automate Your <span className="text-brand-400">Revenue Engine?</span>
        </h2>

        {/* Subcopy – streamlined */}
        <p className="mt-5 text-sm sm:text-base text-slate-300">
          On a short strategy call, we&apos;ll highlight your highest-leverage AI
          wins. Then we&apos;ll walk through a live Sentient Systems demo so you
          can see calls, chats, and follow-up running on autopilot while your team
          focuses on real work.
        </p>

        {/* Product/offer pill */}
        <div className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full border border-brand-400/40 bg-slate-950/70 px-4 py-2 text-[11px] font-medium text-slate-200 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>Sentient Systems · Voice AI · Chat · Web · Reputation</span>
        </div>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={openBooking}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm sm:text-base font-medium text-white shadow-lg shadow-brand-500/40 transition hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <ArrowRight className="h-4 w-4" />
            <span>Book Your Strategy Call</span>
          </button>

          <button
            type="button"
            onClick={scrollToDemo}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm sm:text-base font-medium text-slate-100 backdrop-blur transition hover:border-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-100/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <PlayCircle className="h-5 w-5" />
            <span>Watch the AI in Action</span>
          </button>
        </div>

        {/* Micro trust / risk reversal – simplified */}
        <p className="mt-5 text-xs text-slate-400">
          No pressure—if it&apos;s not a fit, you&apos;ll still leave with a clear
          30-day AI game plan for your business.
        </p>
      </div>
    </section>
  );
};
