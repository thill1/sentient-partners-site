import React, { useMemo, useState } from 'react';
import { ArrowRight, Loader2, PhoneMissed, TrendingUp } from 'lucide-react';
import { Button } from './Button';
import { openBookingModal } from '../lib/siteActions';
import { rememberBlueprint, rememberIndustry } from '../lib/visitorMemory';

const INDUSTRIES = [
  { id: 'dental', label: 'Dental practice' },
  { id: 'hvac', label: 'HVAC company' },
  { id: 'law', label: 'Law firm' },
  { id: 'fitness', label: 'Fitness studio' },
  { id: 'home-services', label: 'Home services' },
  { id: 'other', label: 'Something else' },
];

// Conservative, stated assumption: roughly a third of recovered
// inquiries convert to booked work.
const BOOKING_RATE = 0.35;
const WEEKS_PER_MONTH = 4.33;

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export const BlueprintEngine: React.FC = () => {
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [callsPerWeek, setCallsPerWeek] = useState(60);
  const [missedPct, setMissedPct] = useState(30);
  const [avgJobValue, setAvgJobValue] = useState(400);
  const [phase, setPhase] = useState<'input' | 'generating' | 'ready'>('input');
  const [narrative, setNarrative] = useState<string>('');

  const math = useMemo(() => {
    const missedPerWeek = callsPerWeek * (missedPct / 100);
    const monthlyMissed = missedPerWeek * WEEKS_PER_MONTH;
    const monthlyRecovered = monthlyMissed * BOOKING_RATE * avgJobValue;
    return {
      missedPerWeek: Math.round(missedPerWeek),
      monthlyMissed: Math.round(monthlyMissed),
      monthlyRecovered,
      low: monthlyRecovered * 0.75,
      high: monthlyRecovered * 1.25,
    };
  }, [callsPerWeek, missedPct, avgJobValue]);

  const generate = async () => {
    setPhase('generating');
    rememberIndustry(industry.id, industry.label);
    rememberBlueprint({
      callsPerWeek,
      missedPct,
      avgJobValue,
      monthlyRecovered: Math.round(math.monthlyRecovered),
    });

    const prompt = [
      `You are the senior AI strategist at Sentient Partners, an AI-first agency.`,
      `A ${industry.label.toLowerCase()} owner just shared: ~${callsPerWeek} inbound calls/week,`,
      `~${missedPct}% missed or after-hours, average job value ${fmt(avgJobValue)}.`,
      `Our conservative math says an AI front desk recovers roughly ${fmt(math.low)}–${fmt(math.high)} per month.`,
      `Write their blueprint in 3 short sections with these exact headings:`,
      `WHERE THE MONEY LEAKS / THE SYSTEM WE WOULD INSTALL / FIRST 30 DAYS.`,
      `Plain text only, no markdown symbols. Confident, calm, specific to their industry.`,
      `Under 180 words total. Do not invent statistics beyond the numbers given.`,
    ].join(' ');

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, history: [] }),
      });
      const data = (await res.json()) as { ok?: boolean; text?: string };
      setNarrative(
        data.ok && data.text
          ? data.text
          : 'Your numbers are in — book a strategy call and we will walk the full blueprint together.'
      );
    } catch {
      setNarrative('Your numbers are in — book a strategy call and we will walk the full blueprint together.');
    }
    setPhase('ready');
  };

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
