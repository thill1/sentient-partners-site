import { useEffect, useRef, useState } from 'react';
import { SCENARIOS, type Scenario, type Speaker } from './scenarios';
import { openBookingModal, openSentientChat } from '../../lib/siteActions';
import { getVisitorMemory, rememberIndustry } from '../../lib/visitorMemory';

export interface TranscriptLine {
  speaker: Speaker;
  text: string;
  partial: boolean;
}

export type DemoPhase = 'idle' | 'running' | 'done';

const TYPE_MS = 16;
const FALLBACK_MS_PER_CHAR = 52;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * State and behaviour behind the AI front desk demo: scenario selection,
 * server-voiced playback through /api/voice (with a typed fallback), the
 * value ledger, and the handoffs to the Concierge and booking. Shared by the
 * production FrontDeskDemo and the California concept's call console, so both
 * run the same call.
 */
export function useFrontDeskDemo() {
  const [scenario, setScenario] = useState<Scenario>(() => {
    const remembered = getVisitorMemory().industryId;
    return SCENARIOS.find((s) => s.id === remembered) ?? SCENARIOS[0];
  });
  const [phase, setPhase] = useState<DemoPhase>('idle');
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

  useEffect(() => {
    const urlCache = audioUrlCacheRef.current;
    return () => {
      generationRef.current += 1;
      stopAudio();
      urlCache.forEach((url) => URL.revokeObjectURL(url));
      urlCache.clear();
    };
  }, []);

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

  const bookCall = () => openBookingModal({ source: 'Front Desk Demo', ctaLabel: 'Book Strategy Call' });

  return {
    scenarios: SCENARIOS,
    scenario,
    phase,
    lines,
    speaking,
    doneIds,
    activeLedgerId,
    revenueShown,
    muted,
    setMuted,
    play: () => void run(scenario),
    selectScenario,
    tryItYourself,
    bookCall,
  };
}
