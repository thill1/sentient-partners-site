import React, { useEffect, useRef, useState } from 'react';
import spMonogramWhite from '../assets/sp-monogram-white.png';

/**
 * "The First Listen" — brand intro sequence.
 *
 * A voice waveform of light breathes in a navy void (LISTENING),
 * swells as it hears you (REASONING), then the sound itself lifts
 * and assembles into the SP monogram — the mark is literally built
 * out of voice. One heartbeat pulse, then the void lifts into the site.
 *
 * Plays once per session. Skippable. Reduced-motion gets a calm fade.
 */

const SESSION_KEY = 'sp-intro-seen';

// Choreography (ms)
const T_SWELL = 1450;
const T_ASSEMBLE = 2450;
const T_PULSE = 3550;
const T_LIFT = 4250;
const T_DONE = 5150;

const EASE_DRAMATIC = 'cubic-bezier(0.16, 1, 0.3, 1)';

interface Particle {
  x: number;
  y: number;
  homeX: number; // resting position on the waveform line
  targetX: number; // destination inside the monogram
  targetY: number;
  size: number;
  phase: number;
  speed: number;
  drift: number; // per-particle assemble delay 0..1
  glow: number;
}

type Stage = 'listening' | 'reasoning' | 'assembling' | 'pulse' | 'lifting';

const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export const IntroSplash: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (window.sessionStorage.getItem(SESSION_KEY)) return false;
    return true;
  });
  const [stage, setStage] = useState<Stage>('listening');
  const [lifting, setLifting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const doneRef = useRef(false);
  const skipRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!visible) return;

    window.sessionStorage.setItem(SESSION_KEY, '1');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Lock scroll while the void holds the room
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
      setStage('lifting');
      setLifting(true);
      timers.push(window.setTimeout(finish, T_DONE - T_LIFT));
    };

    skipRef.current = beginLift;

    if (reduceMotion) {
      // Calm, luxurious fade: monogram + wordmark only.
      setStage('pulse');
      timers.push(window.setTimeout(beginLift, 1600));
      return () => {
        timers.forEach(clearTimeout);
        document.body.style.overflow = previousOverflow;
      };
    }

    timers.push(window.setTimeout(() => setStage('reasoning'), T_SWELL));
    timers.push(window.setTimeout(() => setStage('assembling'), T_ASSEMBLE));
    timers.push(window.setTimeout(() => setStage('pulse'), T_PULSE));
    timers.push(window.setTimeout(beginLift, T_LIFT));

    // ---------- Canvas scene ----------
    const canvas = canvasRef.current;
    if (!canvas) return () => timers.forEach(clearTimeout);
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => timers.forEach(clearTimeout);

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

    const isMobile = width < 640;
    const PARTICLE_COUNT = isMobile ? 700 : 1400;
    const particles: Particle[] = [];
    const startedAt = performance.now();

    // Sample the monogram alpha channel for particle destinations
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
      const step = 2;
      for (let y = 0; y < S; y += step) {
        for (let x = 0; x < S; x += step) {
          if (data[(y * S + x) * 4 + 3] > 128) points.push([x, y]);
        }
      }
      // Monogram footprint on screen
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
      const elapsed = now - startedAt;
      ctx.clearRect(0, 0, width, height);

      // Wave energy per stage
      const swell = clamp01((elapsed - T_SWELL + 400) / 900);
      const baseAmp = 6 + swell * (isMobile ? 42 : 64);
      const assembleT = clamp01((elapsed - T_ASSEMBLE) / 950);
      const pulseT = clamp01((elapsed - T_PULSE) / 620);

      for (const p of particles) {
        p.phase += 0.016 * p.speed * (1 + swell * 1.6);

        // Waveform position: layered sines, center-weighted
        const centerWeight = 1 - Math.abs(p.homeX - width / 2) / (width / 2);
        const waveY =
          height / 2 +
          Math.sin(p.phase + p.homeX * 0.012) * baseAmp * (0.35 + centerWeight * 0.65) +
          Math.sin(p.phase * 0.5 + p.homeX * 0.004) * baseAmp * 0.3;

        // Per-particle staggered assemble
        const t = easeOutQuint(clamp01(assembleT * 1.35 - p.drift * 0.35));
        p.x = p.homeX + (p.targetX - p.homeX) * t;
        p.y = waveY + (p.targetY - waveY) * t;

        const settled = t > 0.96;
        const shimmer = settled ? 0.75 + Math.sin(p.phase * 2) * 0.25 : 1;
        const alpha =
          (0.28 + centerWeight * 0.45 + p.glow * 0.27) *
          shimmer *
          (settled && pulseT > 0 ? 0.85 + Math.sin(pulseT * Math.PI) * 0.15 : 1);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = settled ? '#EAF0FB' : '#A8B9D9';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (settled ? 0.9 : 1), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Heartbeat ring
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
      if (e.key === 'Escape' || e.key === 'Enter') beginLift();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [visible, onDone]);

  if (!visible) return null;

  const wordStage = stage === 'listening' ? 'LISTENING' : stage === 'reasoning' ? 'REASONING' : null;
  const showLockup = stage === 'assembling' || stage === 'pulse' || stage === 'lifting';

  return (
    <div
      role="dialog"
      aria-label="Sentient Partners introduction"
      onClick={() => skipRef.current()}
      className="fixed inset-0 z-[100] cursor-pointer overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 50% 42%, #0A1836 0%, #050B1F 55%, #030713 100%)',
        transform: lifting ? 'translateY(-100%)' : 'translateY(0)',
        transition: `transform ${(T_DONE - T_LIFT) / 1000}s ${EASE_DRAMATIC}`,
        willChange: 'transform',
      }}
    >
      {/* Film grain */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

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

      {/* Skip */}
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
