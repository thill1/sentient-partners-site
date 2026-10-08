import React, { useEffect, useRef } from 'react';
import { Moon, Play, RotateCcw, Volume2, VolumeX, Mic, PhoneCall } from 'lucide-react';
import { Button } from '../Button';
import { Waveform } from './Waveform';
import { ValueLedger } from './ValueLedger';
import { SCENARIOS } from './scenarios';
import { useFrontDeskDemo } from './useFrontDeskDemo';

export const FrontDeskDemo: React.FC = () => {
  const {
    scenario,
    phase,
    lines,
    speaking,
    doneIds,
    activeLedgerId,
    revenueShown,
    muted,
    setMuted,
    play,
    selectScenario,
    tryItYourself,
    bookCall,
  } = useFrontDeskDemo();
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

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
            {scenario.clockStart}, after hours
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
              onClick={play}
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
              <Button size="lg" onClick={play}>
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
            onClick={bookCall}
            disabled={phase !== 'done'}
          >
            Book a strategy call
          </Button>
        </div>
      </div>
    </div>
  );
};
