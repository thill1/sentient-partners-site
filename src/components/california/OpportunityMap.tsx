import React from 'react';
import { Loader2 } from 'lucide-react';
import { CA_CTA, CA_OPPORTUNITY_MAP } from '../../content/californiaContent';
import {
  BLUEPRINT_INDUSTRIES,
  BOOKING_RATE,
  FALLBACK_NARRATIVE,
  WEEKS_PER_MONTH,
  formatDollars,
  useBlueprintEngine,
} from '../../hooks/useBlueprintEngine';
import { openBookingModal } from '../../lib/siteActions';
import { MapDocument } from './MapDocument';
import { Arrow, CaButton, Reveal } from './primitives';

const Field: React.FC<{
  id: string;
  label: string;
  value: number;
  setValue: (n: number) => void;
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
}> = ({ id, label, value, setValue, min, max, step, format }) => (
  <div>
    <div className="mb-2 flex items-baseline justify-between gap-4">
      <label htmlFor={id} className="text-[14px] text-ca-navy/70">
        {label}
      </label>
      <output htmlFor={id} className="font-display text-[22px] lining-nums tabular-nums text-ca-navy">
        {format(value)}
      </output>
    </div>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => setValue(Number(e.target.value))}
      className="ca-range w-full"
      style={{ ['--fill' as string]: `${((value - min) / (max - min)) * 100}%` }}
    />
  </div>
);

const SECTIONS = [
  { match: 'WHERE THE MONEY LEAKS', title: 'Where work gets stuck' },
  { match: 'THE SYSTEM WE WOULD INSTALL', title: 'Systems to consider' },
  { match: 'FIRST 30 DAYS', title: 'An implementation sequence' },
];

/** Split the drafted map into its three sections; null if the model didn't follow the headings. */
function parseMap(text: string) {
  const upper = text.toUpperCase();
  const found = SECTIONS.map((s) => ({ ...s, at: upper.indexOf(s.match) })).filter((s) => s.at >= 0);
  if (found.length < 2) return null;
  found.sort((a, b) => a.at - b.at);
  return found.map((s, i) => ({
    title: s.title,
    body: text
      .slice(s.at + s.match.length, i + 1 < found.length ? found[i + 1].at : undefined)
      .replace(/^[\s:.-]+/, '')
      .trim(),
  }));
}

/**
 * The signature engagement, framed as a document. The interactive estimate is
 * the production Blueprint Engine's logic via useBlueprintEngine, same math,
 * same /api/gemini request, same visitor memory.
 */
export const OpportunityMap: React.FC = () => {
  const engine = useBlueprintEngine();
  const { industry, math, phase } = engine;
  const openCall = (source: string) =>
    openBookingModal({ source: `California · ${source}`, ctaLabel: CA_CTA.primary });
  const range = `${formatDollars(math.low)} to ${formatDollars(math.high)}`;
  const methodology = `Assumes ${Math.round(BOOKING_RATE * 100)}% of recovered inquiries book, shown as a ±25% range.`;
  const monthlyCalls = Math.round(engine.callsPerWeek * WEEKS_PER_MONTH);
  const wouldBook = Math.round(math.monthlyMissed * BOOKING_RATE);
  const leak = [
    { label: 'Calls a month', value: monthlyCalls },
    { label: 'Missed or after hours', value: math.monthlyMissed },
    { label: `Would book if answered, at ${Math.round(BOOKING_RATE * 100)}%`, value: wouldBook },
  ];
  // If the AI draft is unavailable, show a plain draft built only from the visitor's own numbers.
  const offline = engine.narrative === FALLBACK_NARRATIVE;
  const localDraft = [
    {
      title: 'Where work gets stuck',
      body: `About ${math.monthlyMissed} of your ${monthlyCalls} monthly calls go unanswered or arrive after hours. If ${Math.round(
        BOOKING_RATE * 100,
      )}% of those booked, that is roughly ${wouldBook} jobs, worth about ${formatDollars(math.monthlyRecovered)} a month.`,
    },
    {
      title: 'Systems to consider',
      body: 'An AI front desk could help handle after-hours calls, collect the caller’s needs, and connect qualified inquiries to your calendar, with clear handoffs to your team.',
    },
    {
      title: 'An implementation sequence',
      body: 'Map how your calls and bookings flow today. Build, connect, and test the front desk with your team. Go live after hours first, then review every call together.',
    },
  ];
  const sections = phase === 'ready' ? (offline ? localDraft : parseMap(engine.narrative)) : null;

  return (
    <section id="diagnosis" aria-labelledby="ca-map-heading" className="bg-ca-ivory text-ca-navy">
      <div className="mx-auto max-w-[1400px] ca-section px-5 sm:px-8 lg:px-12">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-12">
          <Reveal className="lg:col-span-6">
            <h2
              id="ca-map-heading"
              className="ca-h2"
            >
              {CA_OPPORTUNITY_MAP.heading}
            </h2>
            <p className="mt-7 max-w-[34rem] ca-lede text-ca-navy/70">
              {CA_OPPORTUNITY_MAP.body}
            </p>
            <CaButton className="mt-8" onClick={() => openCall('Opportunity Map')}>
              {CA_CTA.primary} <Arrow />
            </CaButton>
          </Reveal>

          <Reveal delay={120} className="lg:col-span-5 lg:col-start-8 lg:pt-3">
            <p className="text-[14px] text-ca-granite">{CA_OPPORTUNITY_MAP.coversLabel}</p>
            <ul className="mt-5 grid border-t border-ca-navy sm:grid-cols-2 sm:gap-x-8">
              {CA_OPPORTUNITY_MAP.covers.map((item) => (
                <li key={item} className="border-b border-ca-navy/12 py-3.5 text-[15px]">
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-10 lg:mt-12">
              <MapDocument
                sections={SECTIONS.map((s) => s.title)}
                title={CA_OPPORTUNITY_MAP.documentTitle}
                subtitle={CA_OPPORTUNITY_MAP.documentSubtitle}
              />
            </div>
          </Reveal>
        </div>

        {/* The preliminary read: a working document, not a calculator widget. */}
        <Reveal className="mt-10 lg:mt-14">
          <details id="calculator" className="group border border-ca-navy/15 bg-[#FBFAF7]">
            <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 font-display text-[22px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-navy sm:px-10 [&::-webkit-details-marker]:hidden">
              {CA_OPPORTUNITY_MAP.previewHeading}
              <span aria-hidden="true" className="text-[24px] transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="flex flex-col gap-2 border-b border-ca-navy/12 px-6 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:px-10">
              <p className="text-[14px] text-ca-granite">
                {CA_OPPORTUNITY_MAP.previewEyebrow}: {industry.label}
              </p>
            </div>

            {phase === 'input' && (
              <div className="grid lg:grid-cols-2">
                <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
                  <p className="max-w-[28rem] ca-body text-ca-navy/65">
                    {CA_OPPORTUNITY_MAP.previewBody}
                  </p>
                  <fieldset>
                    <legend className="mb-3 text-[14px] text-ca-navy/70">Your business</legend>
                    <div className="flex flex-wrap gap-2">
                      {BLUEPRINT_INDUSTRIES.map((option) => {
                        const selected = option.id === industry.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => engine.setIndustry(option)}
                            className={`min-h-[44px] rounded-[2px] border px-3.5 text-[14px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ca-orange ${
                              selected
                                ? 'border-ca-navy bg-ca-navy text-ca-ivory'
                                : 'border-ca-navy/20 text-ca-navy/75 hover:border-ca-navy/60'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <Field id="ca-calls" label="Inbound calls per week" value={engine.callsPerWeek} setValue={engine.setCallsPerWeek} min={10} max={400} step={5} format={(n) => `${n}`} />
                  <Field id="ca-missed" label="Missed or after-hours" value={engine.missedPct} setValue={engine.setMissedPct} min={5} max={70} step={5} format={(n) => `${n}%`} />
                  <Field id="ca-value" label="Average job value" value={engine.avgJobValue} setValue={engine.setAvgJobValue} min={50} max={5000} step={50} format={formatDollars} />
                </div>

                <div className="flex flex-col justify-between border-t border-ca-navy/12 bg-ca-navy px-6 py-8 text-ca-ivory sm:px-10 sm:py-10 lg:border-l lg:border-t-0">
                  <div>
                    <p className="text-[14px] text-ca-ivory/65">{CA_OPPORTUNITY_MAP.estimateLabel}</p>
                    <p aria-live="polite" className="mt-4 font-display text-[40px] leading-none lining-nums tabular-nums sm:text-[54px]">
                      {range}
                    </p>

                    {/* Where it leaks, drawn only from the visitor's own numbers. */}
                    <dl className="mt-8 space-y-4">
                      {leak.map((row, i) => (
                        <div key={row.label} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 text-[13px]">
                          <dt className="text-ca-ivory/70">{row.label}</dt>
                          <dd className="font-mono tabular-nums text-ca-ivory">{row.value.toLocaleString()}</dd>
                          <dd aria-hidden="true" className="col-span-2 mt-2 h-[2px] bg-ca-ivory/10">
                            <span
                              className={`block h-full transition-[width] duration-500 ease-out ${i === 2 ? 'bg-ca-orange' : 'bg-ca-ivory/70'}`}
                              style={{ width: `${Math.max(1.5, (row.value / Math.max(1, monthlyCalls)) * 100)}%` }}
                            />
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <p className="mt-6 text-[14px] leading-relaxed text-ca-ivory/80">
                      {wouldBook} booked jobs a month at {formatDollars(engine.avgJobValue)} each is about {formatDollars(math.monthlyRecovered)}.
                    </p>

                    <p className="mt-6 border-t border-ca-ivory/15 pt-4 text-[12px] leading-relaxed text-ca-ivory/65">
                      {methodology} {CA_OPPORTUNITY_MAP.disclaimer}
                    </p>
                  </div>
                  <CaButton tone="onDark" className="mt-10 w-full sm:w-auto sm:self-start" onClick={() => void engine.generate()}>
                    {CA_OPPORTUNITY_MAP.generateLabel} <Arrow />
                  </CaButton>
                </div>
              </div>
            )}

            {phase === 'generating' && (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-6 py-16 text-center" role="status">
                <Loader2 className="h-6 w-6 animate-spin text-ca-navy/60 motion-reduce:animate-none" aria-hidden="true" />
                <p className="font-display text-[22px]">{CA_OPPORTUNITY_MAP.generatingLabel}</p>
              </div>
            )}

            {phase === 'ready' && (
              <div className="grid lg:grid-cols-[1fr_22rem]">
                <article className="px-6 py-8 sm:px-10 sm:py-10">
                  <p className="font-display text-[22px]">{CA_OPPORTUNITY_MAP.readyEyebrow}</p>
                  <p className="mt-1 text-[14px] text-ca-granite">Prepared just now for: {industry.label}</p>
                  {sections ? (
                    <ol className="mt-8 max-w-[40rem] border-t border-ca-navy/15">
                      {sections.map((section, i) => (
                        <li key={section.title} className="grid gap-2 border-b border-ca-navy/10 py-6 sm:grid-cols-[3rem_1fr] sm:gap-4">
                          <span className="font-display text-[18px] lining-nums text-ca-rust">{String(i + 1).padStart(2, '0')}</span>
                          <div>
                            <h3 className="font-display text-[22px] leading-tight">{section.title}</h3>
                            <p className="mt-3 whitespace-pre-line ca-body text-ca-navy/85">{section.body}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="mt-6 max-w-[40rem] whitespace-pre-line text-[16px] leading-[1.75] text-ca-navy/85">
                      {engine.narrative}
                    </div>
                  )}
                </article>
                <aside className="flex flex-col gap-4 border-t border-ca-navy/12 px-6 py-8 sm:px-10 lg:border-l lg:border-t-0">
                  <p className="text-[14px] text-ca-granite">Illustrative monthly range</p>
                  <p className="font-display text-[34px] leading-none lining-nums tabular-nums">{range}</p>
                  <p className="text-[12px] leading-relaxed text-ca-granite">
                    {methodology} {CA_OPPORTUNITY_MAP.disclaimer}
                  </p>
                  <CaButton className="mt-4" onClick={() => openCall('Opportunity Map result')}>
                    {CA_CTA.primary} <Arrow />
                  </CaButton>
                  <CaButton variant="line" onClick={() => engine.setPhase('input')}>
                    Adjust my numbers
                  </CaButton>
                </aside>
              </div>
            )}
          </details>
        </Reveal>
      </div>
    </section>
  );
};
