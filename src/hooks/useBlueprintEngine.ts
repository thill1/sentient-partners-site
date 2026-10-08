import { useMemo, useState } from 'react';
import { rememberBlueprint, rememberIndustry } from '../lib/visitorMemory';

export const BLUEPRINT_INDUSTRIES = [
  { id: 'dental', label: 'Dental practice' },
  { id: 'hvac', label: 'HVAC company' },
  { id: 'law', label: 'Law firm' },
  { id: 'fitness', label: 'Fitness studio' },
  { id: 'home-services', label: 'Home services' },
  { id: 'other', label: 'Something else' },
];

// Conservative, stated assumption: roughly a third of recovered
// inquiries convert to booked work.
export const BOOKING_RATE = 0.35;
export const WEEKS_PER_MONTH = 4.33;

export const formatDollars = (n: number) => `$${Math.round(n).toLocaleString()}`;

export const FALLBACK_NARRATIVE =
  'Your numbers are in. Book a strategy call and we will walk the full blueprint together.';

export type BlueprintPhase = 'input' | 'generating' | 'ready';

/**
 * State, math, and the Gemini request behind the Blueprint Engine.
 * Shared by the production BlueprintEngine and the California concept's
 * Opportunity Map so both use one calculation and one API call.
 */
export function useBlueprintEngine() {
  const [industry, setIndustry] = useState(BLUEPRINT_INDUSTRIES[0]);
  const [callsPerWeek, setCallsPerWeek] = useState(60);
  const [missedPct, setMissedPct] = useState(30);
  const [avgJobValue, setAvgJobValue] = useState(400);
  const [phase, setPhase] = useState<BlueprintPhase>('input');
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
      `~${missedPct}% missed or after-hours, average job value ${formatDollars(avgJobValue)}.`,
      `Our conservative math says an AI front desk recovers roughly ${formatDollars(math.low)}–${formatDollars(math.high)} per month.`,
      `Write their blueprint in 3 short sections with these exact headings:`,
      `WHERE THE MONEY LEAKS / THE SYSTEM WE WOULD INSTALL / FIRST 30 DAYS.`,
      `Plain text only, no markdown symbols, no em dashes. Confident, calm, specific to their industry.`,
      `Under 180 words total. Do not invent statistics beyond the numbers given.`,
    ].join(' ');

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, history: [] }),
      });
      const data = (await res.json()) as { ok?: boolean; text?: string };
      setNarrative(data.ok && data.text ? data.text : FALLBACK_NARRATIVE);
    } catch {
      setNarrative(FALLBACK_NARRATIVE);
    }
    setPhase('ready');
  };

  return {
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
  };
}
