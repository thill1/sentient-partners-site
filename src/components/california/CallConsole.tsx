import React, { useEffect, useRef, useState } from 'react';
import { Check, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useFrontDeskDemo } from '../demo/useFrontDeskDemo';
import type { Speaker } from '../demo/scenarios';
import { Arrow, CaButton } from './primitives';
import { CA_CTA } from '../../content/californiaContent';
import { openBookingModal } from '../../lib/siteActions';

/** "9:47 PM" → seconds since midnight. */
function parseClock(clock: string) {
  const m = clock.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 3600 + Number(m[2]) * 60;
}

function formatClock(total: number) {
  const t = ((total % 86400) + 86400) % 86400;
  const h24 = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const h = h24 % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

/**
 * Signal scope: an oscilloscope line that carries the call. Before the call is
 * taken it rings (amber, in a ring cadence: two bursts, then a rest). Then it
 * swells with whoever is speaking (ivory for the AI, Pacific blue for the
 * caller) and settles to a faint carrier line between turns.
 */
const SignalScope: React.FC<{ speaking: Speaker | null; live: boolean; ringing: boolean }> = ({ speaking, live, ringing }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({ speaking, live, ringing });
  state.current = { speaking, live, ringing };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let visible = true;
    let amp = 0.05;
    let t = 0;
    let last = 0;

    const draw = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      t += dt;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const { speaking: who, live: on, ringing: unanswered } = state.current;
      const ring = unanswered && !who;
      const beat = t % 3;
      const burst = ring && (beat < 0.45 || (beat > 0.65 && beat < 1.1));
      const target = who === 'agent' ? 1 : who === 'caller' ? 0.8 : ring ? (burst ? 0.5 : 0.04) : on ? 0.08 : 0.04;
      amp += (target - amp) * Math.min(1, dt * (ring ? 12 : 6));
      const color = ring ? '255,176,92' : who === 'caller' ? '124,152,184' : '247,240,226';

      // Syllable-like modulation so speech reads as speech, not a sine. A ring is a steady tone.
      const syllable = ring ? 1 : 0.55 + 0.45 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1.2));
      const mid = h / 2;
      const path = (scale: number) => {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const k = x / w;
          const taper = Math.sin(Math.PI * k);
          const y =
            mid +
            taper *
              amp *
              scale *
              syllable *
              (Math.sin(k * 38 + t * 9) * 0.5 + Math.sin(k * 91 - t * 13) * 0.3 + Math.sin(k * 17 + t * 4) * 0.4) *
              (h * 0.42);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      };
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(${color},0.12)`;
      path(1.05);
      ctx.stroke();
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = `rgba(${color},0.9)`;
      path(1);
      ctx.stroke();

      if (!reduced && visible && !document.hidden) raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(draw);
      }
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
    });
    io.observe(canvas);
    const onVis = () => !document.hidden && visible && start();
    document.addEventListener('visibilitychange', onVis);
    start();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="block h-16 w-full sm:h-20" />;
};

/**
 * The live AI front desk, designed for the concept: the same call, voice,
 * ledger, and handoffs as the production demo (via useFrontDeskDemo), shown as
 * an operations console rather than a stack of rounded cards.
 */
export const CallConsole: React.FC = () => {
  const demo = useFrontDeskDemo();
  const { scenario, phase, lines, speaking, doneIds, activeLedgerId, revenueShown, muted } = demo;
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [clock, setClock] = useState(() => parseClock(scenario.clockStart));

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  // The call clock starts at the scenario's time, runs during the call, and holds when it ends.
  useEffect(() => {
    if (phase === 'idle') setClock(parseClock(scenario.clockStart));
    if (phase === 'running') setClock(parseClock(scenario.clockStart));
  }, [phase, scenario.clockStart]);
  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => setClock((c) => c + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const status = phase === 'idle' ? 'Incoming call' : phase === 'running' ? 'On the line' : 'Call complete';
  const done = phase === 'done';
  // Before the call is taken, the console shows what the caller is about to say.
  const opening = scenario.beats.find((b) => b.speaker === 'caller');

  return (
    <div className="border border-ca-ivory/15 bg-[linear-gradient(180deg,rgba(124,152,184,0.06),rgba(124,152,184,0.015))]">
      {/* Scenario selector */}
      <div role="group" aria-label="Choose a business" className="flex overflow-x-auto border-b border-ca-ivory/10 max-sm:[mask-image:linear-gradient(to_right,black_82%,transparent)]">
        {demo.scenarios.map((s) => {
          const active = s.id === scenario.id;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={active}
              onClick={() => demo.selectScenario(s)}
              className={`relative min-h-[52px] shrink-0 px-5 text-[14px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ca-orange ${
                active ? 'text-ca-ivory' : 'text-ca-ivory/55 hover:text-ca-ivory/85'
              }`}
            >
              {s.industry}
              <span
                aria-hidden="true"
                className={`absolute inset-x-5 bottom-0 h-px bg-ca-orange transition-transform duration-500 ${active ? 'scale-x-100' : 'scale-x-0'}`}
              />
            </button>
          );
        })}
      </div>

      {/* Line header */}
      <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 pt-4 font-mono text-[11px] uppercase tracking-[0.14em] sm:grid-cols-3 sm:px-7">
        <span className={phase === 'running' ? 'text-ca-orange' : phase === 'idle' ? 'text-[#FFB05C]' : 'text-ca-ivory/60'}>{status}</span>
        <span className="hidden text-center text-ca-ivory/60 sm:block">{scenario.businessName}</span>
        <span className="flex items-center justify-end gap-3">
          <span className="tabular-nums text-ca-ivory/80">{formatClock(clock)}</span>
          <button
            type="button"
            onClick={() => demo.setMuted((m) => !m)}
            aria-label={muted ? 'Unmute the call' : 'Mute the call'}
            className="inline-flex h-11 w-11 items-center justify-center border border-ca-ivory/20 text-ca-ivory/75 hover:border-ca-ivory/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ca-orange"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </span>
      </div>

      <div className="px-5 pt-2 sm:px-7">
        <SignalScope speaking={speaking} live={phase === 'running'} ringing={phase === 'idle'} />
      </div>

      <div className="grid border-t border-ca-ivory/10 lg:grid-cols-[1fr_19rem]">
        {/* Transcript */}
        <div className={`flex flex-col px-5 py-6 sm:px-7 ${phase === 'idle' ? 'lg:min-h-[300px]' : 'min-h-[300px]'}`}>
          <p className="font-display text-[20px] leading-snug text-ca-ivory sm:text-[22px]">{scenario.sceneLine}</p>

          {phase === 'idle' ? (
            <div className="mt-6 flex flex-1 flex-col">
              {opening && (
                <div className="grid grid-cols-[4.5rem_1fr] gap-4">
                  <span className="pt-[3px] font-mono text-[11px] uppercase tracking-[0.12em] text-ca-pacific">Caller</span>
                  <p className="ca-body text-ca-ivory/70">{opening.text}</p>
                </div>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 lg:mt-auto lg:pt-8">
                <CaButton tone="onDark" onClick={demo.play}>
                  <Play aria-hidden="true" className="h-4 w-4" /> Play the call
                </CaButton>
                <p className="text-[14px] text-ca-ivory/65">Hear the AI take it from here, to a booked appointment.</p>
              </div>
            </div>
          ) : (
            <div ref={transcriptRef} aria-live="polite" className="mt-6 max-h-[340px] flex-1 space-y-4 overflow-y-auto pr-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-[4.5rem_1fr] gap-4">
                  <span className={`pt-[3px] font-mono text-[11px] uppercase tracking-[0.12em] ${line.speaker === 'agent' ? 'text-ca-ivory/70' : 'text-ca-pacific'}`}>
                    {line.speaker === 'agent' ? 'Sentient' : 'Caller'}
                  </span>
                  <p className={`ca-body ${line.speaker === 'agent' ? 'text-ca-ivory' : 'text-ca-ivory/75'}`}>
                    {line.text}
                    {line.partial ? <span aria-hidden="true" className="ml-0.5 inline-block h-[1em] w-px translate-y-[2px] animate-pulse bg-ca-ivory/80" /> : null}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ledger */}
        <div className="border-t border-ca-ivory/10 px-5 py-6 sm:px-7 lg:border-l lg:border-t-0">
          <p className="text-[14px] text-ca-ivory/60">Handled while you were closed</p>
          <ol className="mt-4 border-t border-ca-ivory/10">
            {scenario.ledger.map((event) => {
              const isDone = doneIds.includes(event.id);
              const running = activeLedgerId === event.id;
              return (
                <li key={event.id} className="relative flex items-baseline justify-between gap-3 border-b border-ca-ivory/10 py-3 text-[14px]">
                  <span className={isDone ? 'text-ca-ivory' : running ? 'text-ca-ivory/85' : 'text-ca-ivory/55'}>{event.label}</span>
                  <span className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-ca-ivory/60">
                    {isDone ? (
                      <>
                        {event.clock}
                        <Check aria-label="done" className="h-3.5 w-3.5 text-ca-orange" />
                      </>
                    ) : running ? (
                      'In progress'
                    ) : (
                      ''
                    )}
                  </span>
                  {running && <span aria-hidden="true" className="absolute bottom-0 left-0 h-px w-full origin-left animate-[caProgress_1.6s_ease-in-out_infinite] bg-ca-orange" />}
                </li>
              );
            })}
          </ol>

          {/* The value opens when the call ends. On phones it takes no room until then. */}
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-700 motion-reduce:transition-none lg:grid-rows-[1fr] ${
              done ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
            aria-hidden={!done}
          >
            <div className="overflow-hidden">
              <p className="pt-6 text-[14px] text-ca-ivory/60">Estimated value</p>
              <p className="mt-1 font-display text-[40px] leading-none lining-nums tabular-nums text-ca-ivory">${revenueShown.toLocaleString()}</p>
              <p className="mt-2 text-[13px] text-ca-ivory/60">{scenario.revenueNote}</p>
              <p className="mt-5 text-[14px] text-ca-ivory">{scenario.bookedSlot.when}</p>
              <p className="text-[13px] text-ca-ivory/60">{scenario.bookedSlot.detail}</p>
            </div>
          </div>
        </div>
      </div>

      {/* What happened, and what to do next: opens when the call ends. */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-700 motion-reduce:transition-none ${
          done ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'
        }`}
        aria-hidden={!done}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-4 border-t border-ca-ivory/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={demo.play}
                disabled={!done}
                className="inline-flex h-11 shrink-0 items-center gap-2 border border-ca-ivory/20 px-3 text-[13px] text-ca-ivory/75 hover:border-ca-ivory/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ca-orange"
              >
                <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Replay
              </button>
              <p className="font-display text-[18px] leading-snug text-ca-ivory">This happened while you were closed.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3 sm:flex-nowrap">
              <CaButton tone="onDark" variant="line" onClick={demo.tryItYourself} disabled={!done}>
                Try it yourself
              </CaButton>
              <CaButton tone="onDark" onClick={() => openBookingModal({ source: 'California · Demo', ctaLabel: CA_CTA.primary, context: scenario.industry })} disabled={!done}>
                {CA_CTA.primary} <Arrow />
              </CaButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
