import React, { useEffect, useRef } from 'react';

interface WaveformProps {
  /** whether someone is "speaking" right now */
  active: boolean;
  /** agent = bright, caller = subdued */
  variant: 'agent' | 'caller';
  className?: string;
}

const BAR_COUNT = 56;

/**
 * Simulated reactive voice waveform. Deterministically smooth and
 * bulletproof across browsers (no AudioContext / analyser required).
 */
export const Waveform: React.FC<WaveformProps> = ({ active, variant, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef(active);
  const variantRef = useRef(variant);
  activeRef.current = active;
  variantRef.current = variant;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let energy = 0;
    const phases = Array.from({ length: BAR_COUNT }, () => Math.random() * Math.PI * 2);
    const speeds = Array.from({ length: BAR_COUNT }, () => 0.09 + Math.random() * 0.12);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const target = activeRef.current ? 1 : 0.12;
      energy += (target - energy) * 0.08;

      const isAgent = variantRef.current === 'agent';
      const dark = document.documentElement.classList.contains('dark');
      const color = isAgent
        ? dark
          ? 'rgba(168, 185, 217, 0.95)'
          : 'rgba(13, 31, 78, 0.9)'
        : dark
        ? 'rgba(168, 185, 217, 0.4)'
        : 'rgba(13, 31, 78, 0.38)';

      const gap = w / BAR_COUNT;
      const barW = Math.max(2, gap * 0.42);
      const mid = h / 2;

      for (let i = 0; i < BAR_COUNT; i++) {
        phases[i] += speeds[i];
        const center = 1 - Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2);
        const wobble = 0.35 + 0.65 * Math.abs(Math.sin(phases[i] + i * 0.6));
        const amp = energy * wobble * (0.25 + center * 0.75);
        const barH = Math.max(2, amp * (h * 0.86));
        ctx.fillStyle = color;
        const x = i * gap + (gap - barW) / 2;
        const r = Math.min(barW / 2, 2);
        const y = mid - barH / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, r);
        ctx.fill();
      }

      if (!reduceMotion) {
        raf = requestAnimationFrame(draw);
      }
    };

    if (reduceMotion) {
      energy = activeRef.current ? 0.7 : 0.12;
      draw();
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`h-16 w-full ${className}`}
    />
  );
};
