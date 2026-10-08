import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, Pause, Play } from 'lucide-react';
import { CA_CTA, CA_HERO } from '../../content/californiaContent';
import { openBookingModal, scrollToSection } from '../../lib/siteActions';
import { Arrow, CaButton, Grain } from './primitives';
import { PhotoStage } from './hero/PhotoStage';
import { VideoStage } from './hero/VideoStage';
import type { HeroStage } from './hero/stage';
import type { Tally } from './hero/signalLayer';

/**
 * The San Francisco waterfront at blue hour: real drone footage panning from
 * the Bay Bridge to downtown, with a live communications layer tracked onto
 * it (VideoStage). If the footage or its tracking data can't load, the
 * photographic scene takes over (PhotoStage). Either way the city's calls,
 * emails and texts start as chaos and resolve into one system routed through
 * Sentient, and the headline and CTAs are present from the first frame. On the
 * footage, the visitor can also place a call of their own by clicking the city.
 */
export const CaliforniaHero: React.FC = () => {
  const meterRef = useRef<HTMLSpanElement>(null);
  const tallyRef = useRef<HTMLSpanElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HeroStage | null>(null);
  const autoRef = useRef<number | null>(null);
  const autoPendingRef = useRef(true);
  const modeRef = useRef<'chaos' | 'order'>('chaos');
  const pausedRef = useRef(false);

  const [mode, setMode] = useState<'chaos' | 'order'>('chaos');
  const [paused, setPaused] = useState(false);
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [stageKind, setStageKind] = useState<'video' | 'photo'>('video');
  // The invitation to place a call shows once the scene can take one, and bows out after the first.
  const [canSend, setCanSend] = useState(false);
  const [sent, setSent] = useState(false);
  const onCanSend = useCallback(() => setCanSend(true), []);
  const onSend = useCallback(() => setSent(true), []);
  modeRef.current = mode;
  pausedRef.current = paused;

  const onFrame = useCallback((o: number) => {
    if (meterRef.current) meterRef.current.style.transform = `scaleX(${o.toFixed(3)})`;
  }, []);

  // A running count of what the scene has done since it last changed mode.
  const onTally = useCallback(({ mode: m, count }: Tally) => {
    const el = tallyRef.current;
    if (!el) return;
    if (count > 0) el.textContent = `${count} ${m === 'order' ? CA_HERO.answered : CA_HERO.unanswered}`;
    el.style.opacity = count > 0 ? '1' : '0';
  }, []);

  const scheduleOrder = useCallback((stage: HeroStage) => {
    if (autoRef.current) window.clearTimeout(autoRef.current);
    autoRef.current = null;
    if (reduced || pausedRef.current || !autoPendingRef.current) return;
    autoRef.current = window.setTimeout(() => {
      autoPendingRef.current = false;
      stage.setTarget(1);
      setMode('order');
      autoRef.current = null;
    }, 4500);
  }, [reduced]);

  // A stage is up: sync it with the controls, then land in the noise and let the system take hold.
  const onReady = useCallback(
    (stage: HeroStage) => {
      sceneRef.current = stage;
      if (pausedRef.current) stage.setPaused(true);
      if (autoRef.current) window.clearTimeout(autoRef.current);
      if (reduced) {
        autoPendingRef.current = false;
        stage.setTarget(1, true);
        setMode('order');
        return;
      }
      if (modeRef.current === 'order') {
        stage.setTarget(1, true);
        return;
      }
      scheduleOrder(stage);
    },
    [reduced, scheduleOrder],
  );

  const onFail = useCallback(() => {
    sceneRef.current = null;
    setStageKind('photo');
    setCanSend(false);
  }, []);

  useEffect(
    () => () => {
      if (autoRef.current) window.clearTimeout(autoRef.current);
    },
    [],
  );

  const choose = (next: 'chaos' | 'order') => {
    autoPendingRef.current = false;
    if (autoRef.current) {
      window.clearTimeout(autoRef.current);
      autoRef.current = null;
    }
    setMode(next);
    sceneRef.current?.setTarget(next === 'order' ? 1 : 0);
  };

  const togglePause = () => {
    const next = !paused;
    pausedRef.current = next;
    setPaused(next);
    sceneRef.current?.setPaused(next);
    if (next && autoRef.current) {
      window.clearTimeout(autoRef.current);
      autoRef.current = null;
    } else if (!next && sceneRef.current) {
      scheduleOrder(sceneRef.current);
    }
  };

  const segment = (active: boolean) =>
    `min-h-[44px] px-3.5 text-[12px] font-medium tracking-[0.02em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ca-orange ${
      active ? 'bg-ca-ivory text-ca-navy' : 'text-ca-ivory/70 hover:text-ca-ivory'
    }`;

  return (
    <section
      id="top"
      data-ca-tone="dark"
      aria-labelledby="ca-hero-heading"
      className={`relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ca-deep text-ca-ivory ${
        paused ? '[&_*]:[animation-play-state:paused]' : ''
      }`}
    >
      {stageKind === 'video' ? (
        <VideoStage
          reduced={reduced}
          copyRef={copyRef}
          onReady={onReady}
          onFrame={onFrame}
          onFail={onFail}
          onTally={onTally}
          onCanSend={onCanSend}
          onSend={onSend}
        />
      ) : (
        <PhotoStage reduced={reduced} copyRef={copyRef} onReady={onReady} onFrame={onFrame} />
      )}

      {/* Scrims: header, text column, and base. */}
      <div aria-hidden="true" className="ca-hero-top-scrim absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(6,12,28,0.55)_0%,rgba(6,12,28,0)_20%)]" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 hidden bg-[linear-gradient(to_right,rgba(6,12,28,0.88)_0%,rgba(6,12,28,0.62)_28%,rgba(6,12,28,0.2)_46%,rgba(6,12,28,0)_60%)] lg:block" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 hidden bg-[radial-gradient(ellipse_62%_58%_at_0%_100%,rgba(6,12,28,0.9)_0%,rgba(6,12,28,0.55)_45%,rgba(6,12,28,0)_75%)] lg:block" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(6,12,28,0.96)_0%,rgba(6,12,28,0.84)_38%,rgba(6,12,28,0.35)_62%,rgba(6,12,28,0)_78%)] lg:bg-[linear-gradient(to_top,rgba(6,12,28,0.5)_0%,rgba(6,12,28,0)_22%)]" />
      <Grain className="-z-10" />

      <div className="ca-hero-content mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-end px-5 pb-36 pt-36 sm:px-8 sm:pt-48 lg:justify-center lg:px-12 lg:pb-24 lg:pt-32">
        <div ref={copyRef} className="max-w-[36rem]">
          <h1
            id="ca-hero-heading"
            className="ca-display ca-hero-heading"
          >
            {CA_HERO.heading.map((line, index) => (
              <React.Fragment key={line}>
                {index > 0 && ' '}
                <span className="block">{line}</span>
              </React.Fragment>
            ))}
          </h1>

          <p className="ca-hero-lede ca-lede mt-6 max-w-[30rem] text-ca-ivory/90 sm:mt-7">
            {CA_HERO.body}
          </p>
          <div className="ca-hero-actions mt-7 flex flex-col gap-2 sm:mt-8 sm:flex-row sm:items-center sm:gap-6">
            <CaButton tone="onDark" onClick={() => openBookingModal({ source: 'California · Hero', ctaLabel: CA_CTA.primary })}>
              {CA_CTA.primary} <Arrow />
            </CaButton>
            <button type="button" onClick={() => scrollToSection('demo')} className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-sm text-[14px] text-ca-ivory/90 underline-offset-4 hover:text-ca-ivory hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ca-ivory sm:justify-start">
              {CA_CTA.seeDemo}
              <ArrowDown aria-hidden="true" strokeWidth={1.75} className="h-4 w-4 transition-transform group-hover:translate-y-0.5 motion-reduce:transition-none" />
            </button>
          </div>
          <p className="ca-hero-note mt-4 max-w-[26rem] text-[13px] leading-relaxed text-ca-ivory/85">{CA_HERO.callNote}</p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-24 z-10 mx-auto hidden max-w-[1400px] items-center justify-end gap-4 px-12 lg:flex">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ca-ivory/85 [text-shadow:0_1px_10px_rgba(6,12,28,0.8)]">{CA_HERO.caption}</p>
        {!reduced && (
          <button
            type="button"
            onClick={togglePause}
            aria-pressed={paused}
            aria-label={paused ? 'Play scene motion' : 'Pause scene motion'}
            className="pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px] border border-ca-ivory/25 text-ca-ivory/85 hover:border-ca-ivory/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ca-ivory"
          >
            {paused ? <Play aria-hidden="true" className="h-3.5 w-3.5" /> : <Pause aria-hidden="true" className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 mx-auto hidden max-w-[1400px] justify-end px-12 lg:flex">
        <aside aria-label={CA_HERO.sceneLabel} className="pointer-events-auto w-[280px] border-t border-ca-ivory/30 bg-ca-deep/85 px-5 pb-5 pt-4 xl:w-[320px]">
          <p className="text-[13px] text-ca-ivory/85">{CA_HERO.sceneLabel}</p>
          <div role="group" aria-label="Inquiry flow illustration" className="mt-3 inline-flex border border-ca-ivory/30">
            <button type="button" aria-pressed={mode === 'chaos'} onClick={() => choose('chaos')} className={segment(mode === 'chaos')}>
              {CA_HERO.chaosLabel}
            </button>
            <button type="button" aria-pressed={mode === 'order'} onClick={() => choose('order')} className={segment(mode === 'order')}>
              {CA_HERO.orderLabel}
            </button>
          </div>
          <p aria-live="polite" className="mt-3 text-[13px] leading-relaxed text-ca-ivory/85">
            {mode === 'order' ? CA_HERO.orderLine : CA_HERO.chaosLine}
          </p>
          <div aria-hidden="true" className="mt-4 flex items-center gap-3">
            <span className="block h-px flex-1 bg-ca-ivory/15">
              <span ref={meterRef} className="block h-px origin-left scale-x-0 bg-ca-orange" />
            </span>
            <span
              ref={tallyRef}
              className="whitespace-nowrap text-right font-mono text-[10px] tabular-nums text-ca-ivory/85 opacity-0 transition-opacity duration-500"
            />
          </div>
          <p
            aria-hidden="true"
            className={`mt-3 text-[12px] text-ca-ivory/85 transition-opacity duration-700 ${
              canSend && !sent && !paused ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <span className="[@media(pointer:coarse)]:hidden">{CA_HERO.sendHint}</span>
            <span className="hidden [@media(pointer:coarse)]:inline">{CA_HERO.sendHintTouch}</span>
          </p>
        </aside>
      </div>

      <div className="absolute inset-x-0 bottom-[76px] mx-auto flex max-w-[1400px] items-center justify-between gap-5 px-5 sm:px-8 lg:hidden">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ca-ivory/85">{CA_HERO.caption}</p>
        {!reduced && (
          <button
            type="button"
            onClick={togglePause}
            aria-pressed={paused}
            aria-label={paused ? 'Play background motion' : 'Pause background motion'}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px] border border-ca-ivory/25 text-ca-ivory/85 hover:border-ca-ivory/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-ivory"
          >
            {paused ? <Play aria-hidden="true" className="h-4 w-4" /> : <Pause aria-hidden="true" className="h-4 w-4" />}
          </button>
        )}
      </div>
    </section>
  );
};
