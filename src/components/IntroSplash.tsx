import React, { useEffect, useRef, useState } from 'react';
import spMonogramWhite from '../assets/sp-monogram-white.png';

/**
 * "The First Listen" — brand intro sequence.
 *
 * A hushed ENTER threshold. On entry: a low bass bloom, and a voice
 * waveform of light that reacts to your cursor (LISTENING), swells
 * (REASONING), then lifts and assembles into the SP monogram — the
 * mark is built out of voice. One heartbeat pulse, then the void
 * lifts into the site.
 *
 * Plays once per session. Skippable. Reduced-motion gets a calm fade.
 */

const SESSION_KEY = 'sp-intro-seen';

// Choreography relative to ENTER (ms)
const T_SWELL = 1100;
const T_ASSEMBLE = 2100;
const T_PULSE = 3200;
const T_LIFT = 3900;
const LIFT_MS = 900;

const EASE_DRAMATIC = 'cubic-bezier(0.16, 1, 0.3, 1)';

interface Particle {
  x: number;
  y: number;
  homeX: number;
  targetX: number;
  targetY: number;
  size: number;
  phase: number;
  speed: number;
  drift: number;
  glow: number;
}

type Stage = 'gate' | 'listening' | 'reasoning' | 'assembling' | 'pulse' | 'lifting';

const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

type AudioContextCtor = typeof AudioContext;
let sharedAudioCtx: AudioContext | null = null;

let audioUnlocked = false;
let mediaEl: HTMLAudioElement | null = null;
let mediaDest: MediaStreamAudioDestinationNode | null = null;

/**
 * Route synth output through a hidden <audio> element. iOS classifies
 * media-element playback as "playback" (not "ambient"), so it plays
 * even when the ringer switch is on silent — the one reliable path.
 */
function getOutputNode(ctx: AudioContext): AudioNode {
  try {
    if (!mediaDest || (mediaDest.context as BaseAudioContext) !== ctx) {
      mediaDest = ctx.createMediaStreamDestination();
      mediaEl = document.createElement('audio');
      mediaEl.setAttribute('playsinline', 'true');
      mediaEl.style.display = 'none';
      mediaEl.srcObject = mediaDest.stream;
      document.body.appendChild(mediaEl);
    }
    if (mediaEl && mediaEl.paused) {
      void mediaEl.play().catch(() => undefined);
    }
    return mediaDest;
  } catch {
    return ctx.destination;
  }
}

function unlockAudio(ctx: AudioContext): void {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    // iOS: ask for the media-playback audio session so the silent
    // ringer switch does not mute Web Audio (iOS 17+).
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch {
    void 0;
  }
  try {
    // Classic Safari unlock: one silent sample inside the user gesture,
    // and start the media-element output path while we hold the gesture.
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    getOutputNode(ctx);
  } catch {
    void 0;
  }
}

function getAudioCtx(): AudioContext | null {
  try {
    if (sharedAudioCtx && sharedAudioCtx.state !== 'closed') {
      if (sharedAudioCtx.state === 'suspended') void sharedAudioCtx.resume();
      unlockAudio(sharedAudioCtx);
      return sharedAudioCtx;
    }
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!Ctor) return null;
    sharedAudioCtx = new Ctor();
    if (sharedAudioCtx.state === 'suspended') void sharedAudioCtx.resume();
    unlockAudio(sharedAudioCtx);
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

// A-minor pentatonic across two octaves — every note harmonious
const SCALE = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

/** One soft harp-like tone; pitch mapped from horizontal position. */
function playWaveNote(xNorm: number): void {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freq = SCALE[Math.min(SCALE.length - 1, Math.max(0, Math.floor(xNorm * SCALE.length)))];

    const small = window.innerWidth < 640;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(small ? 0.22 : 0.14, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1600;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const shimmer = ctx.createOscillator();
    shimmer.type = 'triangle';
    shimmer.frequency.value = freq * 2;
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0.18;

    osc.connect(filter);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(filter);
    filter.connect(gain);
    gain.connect(getOutputNode(ctx));
    osc.start(now);
    shimmer.start(now);
    osc.stop(now + 1.2);
    shimmer.stop(now + 1.2);
  } catch {
    // never let audio break the scene
  }
}

/** Low bass bloom + delayed heartbeat thump, synthesized in Web Audio. */
function playScore(pulseAtMs: number): void {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(getOutputNode(ctx));

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 340;
    lowpass.connect(master);

    // Bass bloom: 48Hz fundamental + quiet octave, slow attack, long tail
    const bloom = (freq: number, peak: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);
      osc.connect(gain);
      gain.connect(lowpass);
      osc.start(now);
      osc.stop(now + 3.6);
    };
    // Fundamental for real speakers; harmonic ladder so small phone
    // speakers (which cannot reproduce <200Hz) still hear the bloom.
    bloom(48, 0.8);
    bloom(96, 0.34);
    bloom(144, 0.18);
    bloom(192, 0.11);

    // Heartbeat thump, timed to the pulse ring
    const thumpAt = now + pulseAtMs / 1000;
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(64, thumpAt);
    thump.frequency.exponentialRampToValueAtTime(40, thumpAt + 0.3);

    // Audible heartbeat body for small speakers
    const thumpHi = ctx.createOscillator();
    const thumpHiGain = ctx.createGain();
    thumpHi.type = 'sine';
    thumpHi.frequency.setValueAtTime(196, thumpAt);
    thumpHi.frequency.exponentialRampToValueAtTime(120, thumpAt + 0.22);
    thumpHiGain.gain.setValueAtTime(0.0001, thumpAt);
    thumpHiGain.gain.exponentialRampToValueAtTime(0.22, thumpAt + 0.015);
    thumpHiGain.gain.exponentialRampToValueAtTime(0.0001, thumpAt + 0.4);
    thumpHi.connect(thumpHiGain);
    thumpHiGain.connect(lowpass);
    thumpHi.start(thumpAt);
    thumpHi.stop(thumpAt + 0.5);
    thumpGain.gain.setValueAtTime(0.0001, thumpAt);
    thumpGain.gain.exponentialRampToValueAtTime(0.5, thumpAt + 0.02);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, thumpAt + 0.5);
    thump.connect(thumpGain);
    thumpGain.connect(lowpass);
    thump.start(thumpAt);
    thump.stop(thumpAt + 0.6);

  } catch {
    // Audio is a garnish; never let it break the sequence.
  }
}

export const IntroSplash: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (window.sessionStorage.getItem(SESSION_KEY)) return false;
    return true;
  });
  const [stage, setStage] = useState<Stage>('gate');
  const [lifting, setLifting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const doneRef = useRef(false);
  const stageRef = useRef<Stage>('gate');
  stageRef.current = stage;
  const enteredAtRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const draggingRef = useRef(false);
  const ripplesRef = useRef<Array<{ x: number; born: number }>>([]);
  const lastNoteRef = useRef({ x: -9999, time: 0 });
  const skipRef = useRef<() => void>(() => undefined);
  const enterRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!visible) return;

    window.sessionStorage.setItem(SESSION_KEY, '1');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let raf = 0;
    const timers: number[] = [];

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      document.body.style.overflow = previousOverflow;
      setVisible(false);
      onDone?.();
    };

    const beginLift = () => {
      if (stageRef.current === 'lifting') return;
      setStage('lifting');
      setLifting(true);
      timers.push(window.setTimeout(finish, LIFT_MS));
    };
    skipRef.current = beginLift;

    const enter = () => {
      if (stageRef.current !== 'gate') return;
      enteredAtRef.current = performance.now();
      playScore(reduceMotion ? 700 : T_PULSE);

      if (reduceMotion) {
        setStage('pulse');
        timers.push(window.setTimeout(beginLift, 1700));
        return;
      }
      setStage('listening');
      timers.push(window.setTimeout(() => setStage('reasoning'), T_SWELL));
      timers.push(window.setTimeout(() => setStage('assembling'), T_ASSEMBLE));
      timers.push(window.setTimeout(() => setStage('pulse'), T_PULSE));
      timers.push(window.setTimeout(beginLift, T_LIFT));
    };
    enterRef.current = enter;

    // ---------- Canvas scene ----------
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d') ?? null;
    if (canvas && ctx && !reduceMotion) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      let width = window.innerWidth;
      let height = window.innerHeight;

      const resize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      };
      resize();
      window.addEventListener('resize', resize);

      const strike = (clientX: number) => {
        const nowMs = performance.now();
        const last = lastNoteRef.current;
        if (nowMs - last.time < 80 && Math.abs(clientX - last.x) < 28) return;
        lastNoteRef.current = { x: clientX, time: nowMs };
        ripplesRef.current.push({ x: clientX, born: nowMs });
        if (ripplesRef.current.length > 10) ripplesRef.current.shift();
        playWaveNote(clientX / width);
      };

      const onPointer = (e: PointerEvent) => {
        mouseRef.current.x = e.clientX;
        mouseRef.current.y = e.clientY;
        if (draggingRef.current && stageRef.current === 'gate') strike(e.clientX);
      };
      const onPointerDown = (e: PointerEvent) => {
        if (stageRef.current !== 'gate') return;
        draggingRef.current = true;
        mouseRef.current.x = e.clientX;
        mouseRef.current.y = e.clientY;
        strike(e.clientX);
      };
      const onPointerUp = () => {
        draggingRef.current = false;
      };
      window.addEventListener('pointermove', onPointer);
      window.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);

      const isMobile = width < 640;
      const PARTICLE_COUNT = isMobile ? 700 : 1400;
      const REACT_RADIUS = isMobile ? 90 : 140;
      const particles: Particle[] = [];

      const img = new Image();
      img.src = spMonogramWhite;
      img.onload = () => {
        const sample = document.createElement('canvas');
        const sctx = sample.getContext('2d');
        if (!sctx) return;
        const S = 220;
        sample.width = S;
        sample.height = S;
        sctx.drawImage(img, 0, 0, S, S);
        const data = sctx.getImageData(0, 0, S, S).data;
        const points: Array<[number, number]> = [];
        for (let y = 0; y < S; y += 2) {
          for (let x = 0; x < S; x += 2) {
            if (data[(y * S + x) * 4 + 3] > 128) points.push([x, y]);
          }
        }
        const markSize = Math.min(isMobile ? 200 : 280, height * 0.34);
        const offsetX = width / 2 - markSize / 2;
        const offsetY = height / 2 - markSize / 2 - (isMobile ? 54 : 66);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const [px, py] = points[Math.floor(Math.random() * points.length)];
          const homeX = width * 0.08 + Math.random() * width * 0.84;
          particles.push({
            x: homeX,
            y: height / 2,
            homeX,
            targetX: offsetX + (px / S) * markSize + (Math.random() - 0.5) * 1.5,
            targetY: offsetY + (py / S) * markSize + (Math.random() - 0.5) * 1.5,
            size: 0.7 + Math.random() * 1.5,
            phase: Math.random() * Math.PI * 2,
            speed: 0.7 + Math.random() * 0.9,
            drift: Math.random(),
            glow: Math.random(),
          });
        }
      };

      const draw = (now: number) => {
        const entered = enteredAtRef.current;
        const elapsed = entered === null ? 0 : now - entered;
        ctx.clearRect(0, 0, width, height);

        const gate = entered === null;
        const swell = gate ? 0 : clamp01((elapsed - T_SWELL + 400) / 900);
        const baseAmp = (gate ? (isMobile ? 7 : 5) : 6) + swell * (isMobile ? 46 : 64);
        const assembleT = gate ? 0 : clamp01((elapsed - T_ASSEMBLE) / 950);
        const pulseT = gate ? 0 : clamp01((elapsed - T_PULSE) / 620);
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        const nowMs = performance.now();
        const ripples = ripplesRef.current;
        while (ripples.length && nowMs - ripples[0].born > 1900) ripples.shift();
        const cursorOnScreen = mx > -999;

        // With no cursor (mobile, or before first mousemove) the wave
        // scans the room on its own — a slow wandering focal point.
        const focalX = cursorOnScreen
          ? mx
          : width / 2 +
            Math.sin(nowMs * 0.00034) * width * 0.3 +
            Math.sin(nowMs * 0.00013 + 2.1) * width * 0.12;
        const focalY = cursorOnScreen
          ? my
          : height / 2 + Math.sin(nowMs * 0.00021 + 1.2) * 26;

        for (const p of particles) {
          p.phase += 0.016 * p.speed * (gate ? 0.6 : 1 + swell * 1.6);

          const centerWeight = 1 - Math.abs(p.homeX - width / 2) / (width / 2);

          // The wave attends: local swell + lean toward cursor or its
          // own wandering focus.
          let attend = 0;
          if (gate) {
            const dxm = p.homeX - focalX;
            const sigma = cursorOnScreen ? 150 : 190;
            attend = Math.exp(-(dxm * dxm) / (2 * sigma * sigma)) * (cursorOnScreen ? 1 : 0.7);
          }
          const ampBoost = 1 + attend * 2.6;
          const lean = gate
            ? Math.max(-52, Math.min(52, (focalY - height / 2) * attend * 0.3))
            : 0;

          // Plucked ripples travel outward along the line
          let rippleY = 0;
          for (const r of ripples) {
            const age = nowMs - r.born;
            const front = Math.abs(Math.abs(p.homeX - r.x) - age * 0.42);
            if (front < 110) {
              rippleY += Math.exp(-(front * front) / (2 * 34 * 34)) * 52 * Math.exp(-age / 620);
            }
          }

          const waveY =
            height / 2 +
            lean -
            rippleY +
            Math.sin(p.phase + p.homeX * 0.012) * baseAmp * ampBoost * (0.35 + centerWeight * 0.65) +
            Math.sin(p.phase * 0.5 + p.homeX * 0.004) * baseAmp * ampBoost * 0.3;

          const t = easeOutQuint(clamp01(assembleT * 1.35 - p.drift * 0.35));
          let x = p.homeX + (p.targetX - p.homeX) * t;
          let y = waveY + (p.targetY - waveY) * t;

          // Cursor reactivity — the wave leans away from your touch,
          // influence receding as the monogram takes form.
          const dx = x - mx;
          const dy = y - my;
          const dist = Math.hypot(dx, dy);
          if (dist < REACT_RADIUS && dist > 0.01) {
            const force = (1 - dist / REACT_RADIUS) * (1 - t) * 34;
            x += (dx / dist) * force;
            y += (dy / dist) * force;
          }

          p.x = x;
          p.y = y;

          const settled = t > 0.96;
          const shimmer = settled ? 0.75 + Math.sin(p.phase * 2) * 0.25 : 1;
          const alpha =
            (0.28 + centerWeight * 0.45 + p.glow * 0.27) *
            shimmer *
            (gate ? 0.55 + attend * 0.4 : 1) *
            (settled && pulseT > 0 ? 0.85 + Math.sin(pulseT * Math.PI) * 0.15 : 1);

          ctx.globalAlpha = alpha;
          ctx.fillStyle = settled ? '#EAF0FB' : '#A8B9D9';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (settled ? 0.9 : 1), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (pulseT > 0 && pulseT < 1) {
          const r = easeOutQuint(pulseT) * Math.max(width, height) * 0.42;
          ctx.strokeStyle = `rgba(168, 185, 217, ${0.5 * (1 - pulseT)})`;
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.arc(width / 2, height / 2 - (isMobile ? 54 : 66), r, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (!doneRef.current) raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);

      const onKey = (e: KeyboardEvent) => {
        if (stageRef.current === 'gate' && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          enter();
        } else if (e.key === 'Escape') {
          beginLift();
        }
      };
      window.addEventListener('keydown', onKey);

      return () => {
        timers.forEach(clearTimeout);
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', onPointer);
        window.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        window.removeEventListener('keydown', onKey);
        document.body.style.overflow = previousOverflow;
      };
    }

    // Reduced motion: keyboard still enters/skips
    const onKey = (e: KeyboardEvent) => {
      if (stageRef.current === 'gate' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        enter();
      } else if (e.key === 'Escape') {
        beginLift();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [visible, onDone]);

  if (!visible) return null;

  const inGate = stage === 'gate';
  const wordStage = stage === 'listening' ? 'LISTENING' : stage === 'reasoning' ? 'REASONING' : null;
  const showLockup = stage === 'assembling' || stage === 'pulse' || stage === 'lifting';

  return (
    <div
      role="dialog"
      aria-label="Sentient Partners introduction"
      onClick={() => {
        if (!inGate) skipRef.current();
      }}
      className="fixed inset-0 z-[100] cursor-pointer overflow-hidden"
      style={{
        touchAction: 'none',
        background:
          'radial-gradient(ellipse at 50% 42%, #0A1836 0%, #050B1F 55%, #030713 100%)',
        transform: lifting ? 'translateY(-100%)' : 'translateY(0)',
        transition: `transform ${LIFT_MS / 1000}s ${EASE_DRAMATIC}`,
        willChange: 'transform',
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

      {/* Gate */}
      <div
        className="absolute inset-x-0 top-[60%] flex flex-col items-center gap-6"
        style={{
          opacity: inGate ? 1 : 0,
          transform: inGate ? 'translateY(0)' : 'translateY(-8px)',
          transition: `opacity 0.6s ${EASE_DRAMATIC}, transform 0.6s ${EASE_DRAMATIC}`,
          pointerEvents: inGate ? 'auto' : 'none',
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            enterRef.current();
          }}
          className="rounded-full border border-white/25 px-10 py-3 text-[11px] uppercase text-white/80 transition-all duration-500 hover:border-white/70 hover:bg-white hover:text-[#0D1F4E]"
          style={{ letterSpacing: '0.5em', paddingLeft: 'calc(2.5rem + 0.5em)' }}
        >
          Enter
        </button>
        <p className="text-[9px] uppercase text-white/30" style={{ letterSpacing: '0.4em', paddingLeft: '0.4em' }}>
          Draw across the wave &middot; Sound on
        </p>
      </div>

      {/* Stage words */}
      <div className="pointer-events-none absolute inset-x-0 top-[62%] flex justify-center">
        {wordStage && (
          <p
            key={wordStage}
            className="text-[11px] uppercase text-white/45"
            style={{
              letterSpacing: '0.55em',
              paddingLeft: '0.55em',
              animation: 'sp-word-in 0.9s cubic-bezier(0.16,1,0.3,1) both',
            }}
          >
            {wordStage}
          </p>
        )}
      </div>

      {/* Lockup */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[62%] flex flex-col items-center gap-4"
        style={{
          opacity: showLockup ? 1 : 0,
          transform: showLockup ? 'translateY(0)' : 'translateY(14px)',
          transition: `opacity 1.1s ${EASE_DRAMATIC}, transform 1.1s ${EASE_DRAMATIC}`,
          transitionDelay: '0.35s',
        }}
      >
        <h1 className="font-display text-3xl font-semibold text-white md:text-5xl">
          Sentient Partners
        </h1>
        <p className="flex items-center gap-3 text-[10px] uppercase text-white/50 md:text-[11px]" style={{ letterSpacing: '0.5em', paddingLeft: '0.5em' }}>
          <span aria-hidden="true" className="h-px w-8 bg-white/30" />
          AI First Agency
          <span aria-hidden="true" className="h-px w-8 bg-white/30" />
        </p>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          skipRef.current();
        }}
        className="absolute bottom-6 right-6 text-[10px] uppercase tracking-[0.35em] text-white/35 transition-colors hover:text-white/70"
      >
        Skip
      </button>

      <style>{`
        @keyframes sp-word-in {
          from { opacity: 0; transform: translateY(10px); filter: blur(6px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
      `}</style>
    </div>
  );
};
