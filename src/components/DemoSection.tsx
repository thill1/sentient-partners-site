import React, { useState } from 'react';
import {
  PhoneCall,
  MessageCircle,
  Globe2,
  Star,
  ArrowRight,
  PlayCircle,
} from 'lucide-react';

type DemoTab = 'voice' | 'chat' | 'web' | 'reputation';

const TABS: { id: DemoTab; label: string; icon: React.ReactNode }[] = [
  { id: 'voice', label: 'Voice AI Receptionist', icon: <PhoneCall className="h-4 w-4" /> },
  { id: 'chat', label: 'Website Chatbot', icon: <MessageCircle className="h-4 w-4" /> },
  { id: 'web', label: 'AI Funnels & Web', icon: <Globe2 className="h-4 w-4" /> },
  { id: 'reputation', label: 'Reputation Engine', icon: <Star className="h-4 w-4" /> },
];

export const DemoSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DemoTab>('voice');

  const openBooking = () => {
    window.dispatchEvent(new CustomEvent('open-booking-modal'));
  };

  return (
    <section
      id="demo"
      className="relative py-20 sm:py-24 px-4 sm:px-6 lg:px-8"
      aria-labelledby="demo-heading"
    >
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            See the Agent in Action
          </p>
          <h2
            id="demo-heading"
            className="mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white"
          >
            Watch Sentient Systems work before you ever sign.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Pick a channel to see how your AI receptionist, chatbot, and funnels
            would actually handle real leads—from first touch to booked
            appointments.
          </p>
        </div>

        {/* Main demo panel as a floating glass card */}
        <div className="mt-10 relative">
          {/* Local background glows behind the card (does NOT cover whole viewport) */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-900/50 to-transparent dark:from-slate-900/70" />
            <div className="absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl" />
            <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-cyan-500/25 blur-3xl" />
          </div>

          <div className="rounded-3xl bg-white/6 dark:bg-slate-950/75 border border-white/10 backdrop-blur-xl shadow-[0_24px_70px_rgba(15,23,42,0.85)] p-5 sm:p-7">
            {/* Tabs */}
            <div
              className="flex flex-wrap gap-2 rounded-full bg-slate-900/70 p-1 text-xs sm:text-sm"
              role="tablist"
              aria-label="Demo channels"
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 sm:px-4 py-1.5 transition ${
                      isActive
                        ? 'bg-slate-800 text-slate-50 shadow-sm shadow-black/40'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)]">
              {/* Transcript / preview */}
              <div className="space-y-3 rounded-2xl bg-slate-950/70 p-4 sm:p-5 border border-white/5">
                {activeTab === 'voice' && (
                  <>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">
                      Sample call · AI Voice Receptionist
                    </p>
                    <div className="space-y-3 text-xs sm:text-sm text-slate-100">
                      <div className="flex items-start gap-2">
                        <div className="mt-1 h-6 w-6 rounded-full bg-gradient-to-br from-brand-500 to-cyan-400 grid place-items-center text-[10px] font-semibold">
                          SP
                        </div>
                        <div className="rounded-2xl bg-slate-900/80 px-3 py-2">
                          <p>
                            “Thanks for calling. Are you looking to book an
                            appointment or get pricing today?”
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-2xl bg-brand-500/90 px-3 py-2 text-right">
                          <p>“I&apos;d like to see if you can help with our roof.”</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="mt-1 h-6 w-6 rounded-full bg-gradient-to-br from-brand-500 to-cyan-400 grid place-items-center text-[10px] font-semibold">
                          SP
                        </div>
                        <div className="rounded-2xl bg-slate-900/80 px-3 py-2">
                          <p>
                            “Absolutely. I&apos;ve got an opening tomorrow at 2:30 PM
                            or Thursday at 10:00 AM. Which works best and what&apos;s
                            the best number for confirmation?”
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'chat' && (
                  <>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">
                      Sample conversation · Website Chat
                    </p>
                    <div className="space-y-3 text-xs sm:text-sm text-slate-100">
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-2xl bg-brand-500/90 px-3 py-2 text-right">
                          <p>“Do you work with small clinics or just big hospitals?”</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="mt-1 h-6 w-6 rounded-full bg-gradient-to-br from-brand-500 to-cyan-400 grid place-items-center text-[10px] font-semibold">
                          SP
                        </div>
                        <div className="rounded-2xl bg-slate-900/80 px-3 py-2">
                          <p>
                            “We support both. A quick question: are you looking for
                            new patient growth, better follow-up, or both?”
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-2xl bg-brand-500/90 px-3 py-2 text-right">
                          <p>“Mainly new patients, but we need better follow-up too.”</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="mt-1 h-6 w-6 rounded-full bg-gradient-to-br from-brand-500 to-cyan-400 grid place-items-center text-[10px] font-semibold">
                          SP
                        </div>
                        <div className="rounded-2xl bg-slate-900/80 px-3 py-2">
                          <p>
                            “Got it. I can grab a few details and then offer times
                            for a quick consult so we can tailor the system to
                            your clinic.”
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'web' && (
                  <>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">
                      Sample flow · AI Funnels & Web
                    </p>
                    <div className="space-y-3 text-xs sm:text-sm text-slate-100">
                      <div className="rounded-xl bg-slate-900/80 px-3 py-2">
                        <p className="text-[11px] text-slate-400">Step 1</p>
                        <p className="font-medium">Landing page visit</p>
                        <p className="mt-1 text-slate-300">
                          Visitor hits your ad-specific landing page with
                          AI-tuned copy and forms.
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-900/80 px-3 py-2">
                        <p className="text-[11px] text-slate-400">Step 2</p>
                        <p className="font-medium">Instant qualification</p>
                        <p className="mt-1 text-slate-300">
                          Form and chat work together to qualify, score, and route
                          the lead in real time.
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-900/80 px-3 py-2">
                        <p className="text-[11px] text-slate-400">Step 3</p>
                        <p className="font-medium">Booked & nurtured</p>
                        <p className="mt-1 text-slate-300">
                          Best leads are auto-booked onto your calendar with
                          follow-up sequences ready to go.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'reputation' && (
                  <>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">
                      Sample workflow · Reputation Engine
                    </p>
                    <div className="space-y-3 text-xs sm:text-sm text-slate-100">
                      <div className="rounded-xl bg-slate-900/80 px-3 py-2">
                        <p className="font-medium">Smart review requests</p>
                        <p className="mt-1 text-slate-300">
                          After a positive interaction, the system automatically
                          sends a branded text and email asking for a review with
                          one tap.
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-900/80 px-3 py-2">
                        <p className="font-medium">Issue-catching feedback</p>
                        <p className="mt-1 text-slate-300">
                          If sentiment is negative, it routes feedback back to
                          your team instead of pushing it public.
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-900/80 px-3 py-2">
                        <p className="font-medium">Always-on reputation</p>
                        <p className="mt-1 text-slate-300">
                          See all reviews and scores in one place with alerts when
                          key platforms move.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Stats + CTA */}
              <div className="space-y-4 rounded-2xl bg-slate-950/80 p-4 sm:p-5 border border-white/5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  What this looks like in your numbers
                </p>

                <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
                  <div className="rounded-xl bg-slate-900/80 px-3 py-2">
                    <p className="text-[11px] text-slate-400">Response time</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-400">
                      &lt; 10 seconds
                    </p>
                    <p className="mt-1 text-slate-300">
                      Every qualified lead gets an instant reply—voice, chat, or web.
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900/80 px-3 py-2">
                    <p className="text-[11px] text-slate-400">Missed calls</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-400">
                      -70–90%
                    </p>
                    <p className="mt-1 text-slate-300">
                      AI picks up when your team can&apos;t, and books straight
                      onto your calendar.
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900/80 px-3 py-2">
                    <p className="text-[11px] text-slate-400">Lead capture</p>
                    <p className="mt-1 text-lg font-semibold text-brand-300">
                      +30–50%
                    </p>
                    <p className="mt-1 text-slate-300">
                      More forms, calls, and chats converted into real
                      opportunities.
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900/80 px-3 py-2">
                    <p className="text-[11px] text-slate-400">Go-live</p>
                    <p className="mt-1 text-lg font-semibold text-slate-50">
                      &lt; 14 days
                    </p>
                    <p className="mt-1 text-slate-300">
                      Most clients see their first Sentient Systems live in two weeks.
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={openBooking}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-500/40 transition hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span>Book a Live Demo & Strategy Call</span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center">
                    Want to just play with it first? Use the demo launcher in the
                    bottom-right corner to see your agent in action.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
