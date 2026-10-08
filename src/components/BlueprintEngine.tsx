import React from 'react';
import { ArrowRight, Loader2, PhoneMissed, TrendingUp } from 'lucide-react';
import { Button } from './Button';
import { openBookingModal } from '../lib/siteActions';
import {
  BLUEPRINT_INDUSTRIES as INDUSTRIES,
  BOOKING_RATE,
  formatDollars as fmt,
  useBlueprintEngine,
} from '../hooks/useBlueprintEngine';

export const BlueprintEngine: React.FC = () => {
  const {
    industry,
    setIndustry,
    callsPerWeek,
    setCallsPerWeek,
    missedPct,
    setMissedPct,
    avgJobValue,
    setAvgJobValue,
    phase,
    setPhase,
    narrative,
    math,
    generate,
  } = useBlueprintEngine();

  const Stepper = ({
    label, value, setValue, min, max, step, format,
  }: {
    label: string; value: number; setValue: (n: number) => void;
    min: number; max: number; step: number; format: (n: number) => string;
  }) => (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-display text-xl font-semibold text-brand-950 dark:text-white tabular-nums">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-brand-900 dark:accent-white"
        aria-label={label}
      />
    </div>
  );

  return (
    <section id="diagnosis" className="py-14 sm:py-20 md:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-brand text-brand-700/90 dark:text-brand-300/90 mb-4">
            The Blueprint Engine
          </p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold text-brand-950 dark:text-white mb-4">
            See your numbers before we ever talk
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Sixty seconds, three questions, your math — a blueprint built from your business, not a brochure.
          </p>
        </div>

        <div className="rounded-2xl border border-brand-900/10 bg-white/85 p-6 md:p-10 dark:border-white/10 dark:bg-white/[0.04]">
          {phase === 'input' && (
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-7">
                <div>
                  <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">Your business</p>
                  <div className="flex flex-wrap gap-2">
                    {INDUSTRIES.map((i) => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => setIndustry(i)}
                        className={`rounded-full border px-4 py-1.5 text-sm transition-all duration-300 ${
                          i.id === industry.id
                            ? 'border-brand-900 bg-brand-900 text-white dark:border-white dark:bg-white dark:text-brand-900'
                            : 'border-brand-900/20 text-brand-900/70 hover:border-brand-900/50 dark:border-white/20 dark:text-white/70 dark:hover:border-white/50'
                        }`}
                      >
                        {i.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Stepper label="Inbound calls per week" value={callsPerWeek} setValue={setCallsPerWeek} min={10} max={400} step={5} format={(n) => `${n}`} />
                <Stepper label="Missed or after-hours" value={missedPct} setValue={setMissedPct} min={5} max={70} step={5} format={(n) => `${n}%`} />
                <Stepper label="Average job value" value={avgJobValue} setValue={setAvgJobValue} min={50} max={5000} step={50} format={fmt} />
              </div>

              <div className="flex flex-col justify-between rounded-2xl bg-brand-900 p-6 text-white dark:bg-white dark:text-brand-900">
                <div>
                  <p className="flex items-center gap-2 text-xs uppercase tracking-brand text-white/60 dark:text-brand-900/60">
                    <PhoneMissed className="h-3.5 w-3.5" /> Live estimate
                  </p>
                  <p className="mt-4 text-sm text-white/70 dark:text-brand-900/70">
                    ~{math.monthlyMissed} missed inquiries a month, worth roughly
                  </p>
                  <p className="mt-1 font-display text-4xl md:text-5xl font-semibold tabular-nums">
                    {fmt(math.low)}–{fmt(math.high)}
                  </p>
                  <p className="mt-1 text-xs text-white/50 dark:text-brand-900/50">
                    per month · assumes {Math.round(BOOKING_RATE * 100)}% of recovered inquiries book
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  className="mt-8 w-full"
                  onClick={() => void generate()}
                >
                  Generate my blueprint <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {phase === 'generating' && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-700 dark:text-brand-300" />
              <p className="font-display text-xl text-brand-950 dark:text-white">
                Drafting your blueprint…
              </p>
            </div>
          )}

          {phase === 'ready' && (
            <div className="grid gap-8 md:grid-cols-[1fr_260px]">
              <div>
                <p className="flex items-center gap-2 text-[11px] uppercase tracking-brand text-brand-700/90 dark:text-brand-300/90">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {industry.label} · prepared just now
                </p>
                <div className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
                  {narrative}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl bg-brand-900 p-5 text-white dark:bg-white dark:text-brand-900">
                  <p className="text-xs text-white/60 dark:text-brand-900/60">Est. monthly recovery</p>
                  <p className="font-display text-3xl font-semibold tabular-nums">
                    {fmt(math.low)}–{fmt(math.high)}
                  </p>
                </div>
                <Button size="md" onClick={() => openBookingModal({ source: 'Blueprint Engine', ctaLabel: 'Book Strategy Call' })}>
                  Walk it with us
                </Button>
                <Button variant="outline" size="md" onClick={() => setPhase('input')}>
                  Adjust my numbers
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
