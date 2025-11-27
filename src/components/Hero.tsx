import React, { useEffect, useRef } from 'react';
import { Button } from './Button';
import { ArrowRight, PlayCircle } from 'lucide-react';

type Intensity = 'subtle' | 'medium' | 'strong';

interface Beam {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  hue: number;
  pulse: number;
  pulseSpeed: number;
}

const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const ctxEl = canvasEl.getContext('2d', { alpha: true });
    if (!ctxEl) return;

    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxEl;

    const MINIMUM_BEAMS = 20;
    const opacityMap: Record<Intensity, number> = {
      subtle: 0.7,
      medium: 0.85,
      strong: 1.0,
    };

    const intensity: Intensity = 'strong';
    let beams: Beam[] = [];
    let rafId = 0;

    function createBeam(w: number, h: number): Beam {
      const angle = -35 + Math.random() * 10;
      return {
        x: Math.random() * w * 1.5 - w * 0.25,
        y: Math.random() * h * 1.5 - h * 0.25,
        width: 30 + Math.random() * 60,
        length: h * 2.5,
        angle,
        speed: 0.6 + Math.random() * 1.2,
        opacity: 0.12 + Math.random() * 0.16,
        hue: 190 + Math.random() * 70,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
      };
    }

    function resetBeam(
      beam: Beam,
      index: number,
      totalBeams: number,
      w: number,
      h: number
    ): Beam {
      const column = index % 3;
      const spacing = w / 3;
      beam.y = h + 100;
      beam.x =
        column * spacing +
        spacing / 2 +
        (Math.random() - 0.5) * spacing * 0.5;
      beam.width = 100 + Math.random() * 100;
      beam.speed = 0.5 + Math.random() * 0.4;
      beam.hue = 190 + (index * 70) / totalBeams;
      beam.opacity = 0.2 + Math.random() * 0.1;
      return beam;
    }

    function updateCanvasSize() {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const w = Math.floor(rect.width || window.innerWidth);
      const h = Math.floor(rect.height || window.innerHeight);

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const density = Math.min(1.5, Math.max(1, (w * h) / (1280 * 800)));
      const total = Math.floor(MINIMUM_BEAMS * density * 1.5);

      beams = Array.from({ length: total }, () => createBeam(w, h));
    }

    function drawBeam(
      c: Canv
