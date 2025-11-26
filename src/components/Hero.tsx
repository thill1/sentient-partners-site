import React from 'react';
import { ArrowRight, PhoneCall, PlayCircle } from 'lucide-react';

export const Hero: React.FC = () => {
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
      id="hero"
      className="relative overflow-hidden bg-slate-950 text-slate-50"
      aria-labelledby="hero-heading"
    >
      {/* Glow / gradient background accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-12 px-4 pt-24 pb-20 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:px-8 lg:pt-28 lg:pb-32">
        {/* Left: Copy + CTAs */}
        <div className="max-w-xl lg:max-w-2xl">
          {/* Badge / eyebrow */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>AI Implementation Agency for SMBs</span>
            <span className="mx-1 text-slate-500">•</span>
            <span className="text-slate-300">Voice · Chat · Web · Automations</span>
          </div>

          {/* Main heading */}
          <h1
            id="hero-heading"
            className="font-display text-balance text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white"
          >
            AI systems that answer, qualify,{" "}
            <span className="text-brand-400">
              and book your best clients 24/7.
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-5 max-w-xl text-balance text-sm sm:text-base text-slate-300">
            Sentient Partners designs and implements AI voice agents, chatbots,
            and automation workflows that turn missed calls and cold website
            traffic into booked appointments and predictable revenue — without
            adding headcount.
          </p>

          {/* Value bullets */}
          <div className="mt-6 grid gap-3 text-sm text-slate-200 sm:text-base">
            <div className="inline-flex items-start gap-2">
              <span className="mt-1 inline-block h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-400 grid place-items-center text-xs">
                ✓
              </span>
              <p>AI Receptionist that answers, qualifies, and books 24/7.</p>
            </div>
            <div className="inline-flex items-start gap-2">
              <span className="mt-1 inline-block h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-400 grid place-items-center text-xs">
                ✓
              </span>
              <p>Website chat that captures & warms up visitors automatically.</p>
            </div>
            <div className="inline-flex items-start gap-2">
              <span className="mt-1 inline-block h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-400 grid place-items-center text-xs">
                ✓
              </span>
              <p>Follow-up sequences via SMS & email that you don’t have to chase.</p>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={openBooking}
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm sm:text-base font-medium text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <PhoneCall className="h-4 w-4" />
              <span>Book a Live AI Demo</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={scrollToDemo}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm sm:text-base font-medium text-slate-100 backdrop-blur transition hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-100/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <PlayCircle className="h-5 w-5" />
              <span>Watch the AI in action</span>
            </button>
          </div>

          {/* Micro social proof */}
          <p className="mt-5 text-xs sm:text-sm text-slate-400">
            Built by a team with enterprise experience across global brands —
            now focused on giving small and mid-sized businesses an unfair
            advantage with applied AI.
          </p>
        </div>

        {/* Right: “Live AI preview” panel */}
        <div className="relative flex-1">
          <div className="glass-panel relative mx-auto w-full max-w-md rounded-3xl border border-white/10 p-5 shadow-2xl shadow-slate-900/60">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  Live AI Preview
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-100">
                  Sentient Voice · Chat · Web
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Online · 24/7
              </div>
            </div>

            {/* Tab-like pills */}
            <div className="mb-4 inline-flex gap-2 rounded-full bg-slate-900/60 p-1 text-xs">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-100">
                Voice AI
              </span>
              <span className="rounded-full px-3 py-1 text-slate-400">
                Chatbot
              </span>
              <span className="rounded-full px-3 py-1 text-slate-400">
                AI Website
              </span>
            </div>

            {/* Fake conversation / UI */}
            <div className="space-y-3 text-xs sm:text-sm text-slate-100">
              <div className="flex items-start gap-2">
                <div className="mt-1 h-6 w-6 rounded-full bg-gradient-to-br from-brand-500 to-cyan-400 text-[10px] grid place-items-center font-semibold text-white">
                  SP
                </div>
                <div className="rounded-2xl bg-slate-900/80 px-3 py-2">
                  <p className="font-medium text-slate-50">
                    “Thanks for calling. Are you looking to book a consultation
                    or get pricing today?”
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl bg-brand-500/90 px-3 py-2 text-right">
                  <p>“I’d like to see how AI could handle our inbound calls.”</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="mt-1 h-6 w-6 rounded-full bg-gradient-to-br from-brand-500 to-cyan-400 text-[10px] grid place-items-center font-semibold text-white">
                  SP
                </div>
                <div className="rounded-2xl bg-slate-900/80 px-3 py-2">
                  <p>
                    “Perfect — I’ve found a time tomorrow at 2:30 PM that works.
                    Want me to book that and send a confirmation by text?”
                  </p>
                </div>
              </div>
            </div>

            {/* Mini stats */}
            <div className="mt-5 grid grid-cols-3 gap-3 text-[10px] sm:text-xs text-slate-300">
              <div className="rounded-2xl bg-slate-900/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Missed calls
                </p>
                <p className="mt-1 text-base font-semibold text-emerald-400">
                  -82%
                </p>
              </div>
              <div className="rounded-2xl bg-slate-900/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Lead capture
                </p>
                <p className="mt-1 text-base font-semibold text-brand-300">
                  +46%
                </p>
              </div>
              <div className="rounded-2xl bg-slate-900/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Go-live
                </p>
                <p className="mt-1 text-base font-semibold text-slate-100">
                  &lt; 14d
                </p>
              </div>
            </div>
          </div>

          {/* Shadow / reflection */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-6 -bottom-6 h-12 rounded-full bg-slate-900/80 blur-3xl"
          />
        </div>
      </div>
    </section>
  );
};
