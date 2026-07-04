import React, { useEffect, useRef, useState } from 'react';
import { Moon, Play, RotateCcw, Volume2, VolumeX, Mic, PhoneCall } from 'lucide-react';
import { Button } from '../Button';
import { Waveform } from './Waveform';
import { ValueLedger } from './ValueLedger';
import { SCENARIOS, type Scenario, type Speaker } from './scenarios';
import { openBookingModal, openSentientChat } from '../../lib/siteActions';
import { getVisitorMemory, rememberIndustry } from '../../lib/visitorMemory';

interface TranscriptLine {
  speaker: Speaker;
  text: string;
  partial: boolean;
}

type Phase = 'idle' | 'running' | 'done';

const TYPE_MS = 16;
const FALLBACK_MS_PER_CHAR = 52;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const FrontDeskDemo: React.FC = () => {
  const [scenario, setScenario] = useState<Scenario>(() => {
    const remembered = getVisitorMemory().industryId;
    return SCENARIOS.find((s) => s.id === remembered) ?? SCENARIOS[0];
  });
  const [phase, setPhase] = useState<Phase>('idle');
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [speaking, setSpeaking] = useState<Speaker | null>(null);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [activeLedgerId, setActiveLedgerId] = useState<string | null>(null);
  const [revenueShown, setRevenueShown] = useState(0);
  const [muted, setMuted] = useState(false);

  const generationRef = useRef(0);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlCacheRef = useRef<Map<string, string>>(new Map());
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const urlCache = audioUrlCacheRef.current;
    return () => {
      generationRef.current += 1;
      stopAudio();
      urlCache.forEach((url) => URL.revokeObjectURL(url));
      urlCache.clear();
    };
  }, []);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const stopAudio = () => {
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.pause();
        audio.src = '';
      } catch {
        void 0;
      }
    }
  };

  const speakThroughApi = async (text: string, voiceId: string, generation: number): Promise<boolean> => {
    try {
      const cacheKey = `${voiceId}|${text}`;
      let url = audioUrlCacheRef.current.get(cacheKey);

      if (!url) {
        const response = await fetch('/api/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceId }),
        });
        if (!response.ok) return false;
        const blob = await response.blob();
        url = URL.createObjectURL(blob);
        audioUrlCacheRef.current.set(cacheKey, url);
      }

      if (generation !== generationRef.current || mutedRef.current) return false;

      if (!audioRef.current) audioRef.current = new Audio();
      const audio = audioRef.current;
      audio.src = url;

      return await new Promise<boolean>((resolve) => {
        const finish = (ok: boolean) => {
          audio.onended = null;
          audio.onerror = null;
          resolve(ok);
        };
        audio.onended = () => finish(true);
        audio.onerror = () => finish(false);
        audio.play().catch(() => finish(false));
      });
    } catch {
      return false;
    }
  };

  const typeLine = async (speaker: Speaker, text: string, generation: number) => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setLines((prev) => [...prev, { speaker, text, partial: false }]);
      return;
    }
    setLines((prev) => [...prev, { speaker, text: '', partial: true }]);
    for (let i = 1; i <= text.length; i += 2) {
      if (generation !== generationRef.current) return;
      const slice = text.slice(0, i);
      setLines((prev) => {
        const next = prev.slice(0, -1);
        next.push({ speaker, text: slice, partial: true });
        return next;
      });
      await sleep(TYPE_MS);
    }
    setLines((prev) => {
      const next = prev.slice(0, -1);
      next.push({ speaker, text, partial: false });
      return next;
    });
  };

  const countUpRevenue = async (target: number, generation: number) => {
    const steps = 30;
    for (let i = 1; i <= steps; i++) {
      if (generation !== generationRef.current) return;
      setRevenueShown(Math.round((target * i) / steps));
      await sleep(28);
    }
  };

  const run = async (selected: Scenario) => {
    generationRef.current += 1;
    const generation = generationRef.current;
    stopAudio();

    setScenario(selected);
    setPhase('running');
    setLines([]);
    setDoneIds([]);
    setActiveLedgerId(null);
    setRevenueShown(0);
    setSpeaking(null);

    await sleep(600);

    for (const beat of selected.beats) {
      if (generation !== generationRef.current) return;
      setSpeaking(beat.speaker);
      if (beat.ledger) setActiveLedgerId(beat.ledger);

      const voiceId = beat.speaker === 'agent' ? 'sp-agent' : selected.callerVoice;
      const typing = typeLine(beat.speaker, beat.text, generation);
      let spoke = false;
      if (!mutedRef.current) {
        spoke = await speakThroughApi(beat.spokenText ?? beat.text, voiceId, generation);
      }
      await typing;
      if (!spoke) {
        await sleep(Math.min(4200, beat.text.length * (FALLBACK_MS_PER_CHAR - TYPE_MS)));
      }

      if (generation !== generationRef.current) return;
      if (beat.ledger) {
        const ledgerId = beat.ledger;
        setDoneIds((prev) => (prev.includes(ledgerId) ? prev : [...prev, ledgerId]));
        setActiveLedgerId(null);
      }
      setSpeaking(null);
      await sleep(beat.pauseAfterMs ?? 500);
    }

    if (generation !== generationRef.current) return;
    setPhase('done');
    await countUpRevenue(selected.revenue, generation);
  };

  const selectScenario = (next: Scenario) => {
    if (next.id === scenario.id && phase !== 'idle') return;
    generationRef.current += 1;
    stopAudio();
    rememberIndustry(next.id, next.industry);
    setScenario(next);
    setPhase('idle');
    setLines([]);
    setDoneIds([]);
    setActiveLedgerId(null);
    setRevenueShown(0);
    setSpeaking(null);
  };

  const tryItYourself = () => {
    rememberIndustry(scenario.id, scenario.industry);
    openSentientChat({
      source: 'Front Desk Demo',
      ctaLabel: 'Try It Yourself',
      context: scenario.industry,
    });
  };

  return (
    <div className="text-left">
      {/* Industry selector */}
      <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Choose an industry">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => selectScenario(s)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-all duration-300 ${
              s.id === scenario.id
                ? 'border-brand-900 bg-brand-900 text-white dark:border-white dark:bg-white dark:text-brand-900'
                : 'border-brand-900/20 bg-transparent text-brand-900/70 hover:border-brand-900/50 dark:border-white/20 dark:text-white/70 dark:hover:border-white/50'
            }`}
          >
            {s.industry}
          </button>
        ))}
      </div>

      {/* Scene header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-brand-900/60 dark:text-white/60">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-900 px-3 py-1 text-white dark:bg-white/10 dark:text-white">
            <Moon className="h-3 w-3" />
            {scenario.clockStart} — after hours
          </span>
          <span className="hidden sm:inline">{scenario.businessName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-brand-900/20 text-brand-900/70 transition hover:border-brand-900/50 dark:border-white/20 dark:text-white/70 dark:hover:border-white/50"
            aria-label={muted ? 'Unmute demo voice' : 'Mute demo voice'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          {phase === 'done' && (
            <button
              type="button"
              onClick={() => void run(scenario)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-brand-900/20 px-3 text-xs text-brand-900/70 transition hover:border-brand-900/50 dark:border-white/20 dark:text-white/70 dark:hover:border-white/50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Replay
            </button>
          )}
        </div>
      </div>

      <p className="mb-5 font-display text-lg text-brand-900/80 dark:text-white/80">
        {scenario.sceneLine}
      </p>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Call panel */}
        <div className="flex flex-col rounded-2xl border border-brand-900/10 bg-white/80 p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-brand text-brand-900/50 dark:text-white/50">
            <span className="inline-flex items-center gap-1.5">
              <PhoneCall className="h-3.5 w-3.5" />
              Live call
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mic className="h-3.5 w-3.5" />
              {speaking === 'agent'
                ? 'AI front desk speaking'
                : speaking === 'caller'
                ? 'Caller speaking'
                : phase === 'done'
                ? 'Call complete'
                : 'Standing by'}
            </span>
          </div>

          <Waveform active={speaking !== null} variant={speaking === 'caller' ? 'caller' : 'agent'} />

          {phase === 'idle' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
              <p className="max-w-xs text-sm text-brand-900/60 dark:text-white/60">
                Press play and listen to the AI handle this call from first ring to booked appointment.
              </p>
              <Button size="lg" onClick={() => void run(scenario)}>
                <Play className="mr-2 h-5 w-5" />
                Play simulation
              </Button>
            </div>
          ) : (
            <div
              ref={transcriptRef}
              className="mt-3 max-h-72 flex-1 space-y-3 overflow-y-auto pr-1"
              aria-live="polite"
            >
              {lines.map((line, i) => (
                <div
                  key={i}
                  className={`max-w-[92%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    line.speaker === 'agent'
                      ? 'ml-auto rounded-br-md bg-brand-900 text-white dark:bg-white dark:text-brand-900'
                      : 'mr-auto rounded-bl-md border border-brand-900/10 bg-brand-50 text-brand-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white'
                  }`}
                >
                  <span className="mb-0.5 block text-[10px] uppercase tracking-brand opacity-50">
                    {line.speaker === 'agent' ? 'AI front desk' : 'Caller'}
                  </span>
                  {line.text}
                  {line.partial ? <span className="animate-pulse">▍</span> : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <ValueLedger
          scenario={scenario}
          doneIds={doneIds}
          activeId={activeLedgerId}
          showOutcome={phase === 'done'}
          revenueShown={revenueShown}
        />
      </div>

      {/* Punchline + handoff */}
      <div
        className={`mt-6 flex flex-col items-center justify-between gap-4 border-t border-brand-900/10 pt-6 transition-all duration-700 dark:border-white/10 sm:flex-row ${
          phase === 'done' ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden={phase !== 'done'}
      >
        <p className="font-display text-xl text-brand-900 dark:text-white">
          This happened while you were closed.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="md" onClick={tryItYourself} disabled={phase !== 'done'}>
            Try it yourself
          </Button>
          <Button
            size="md"
            onClick={() =>
              openBookingModal({ source: 'Front Desk Demo', ctaLabel: 'Book Strategy Call' })
            }
            disabled={phase !== 'done'}
          >
            Book a strategy call
          </Button>
        </div>
      </div>
    </div>
  );
};
