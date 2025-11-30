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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvasInitial = canvasRef.current;
    if (!canvasInitial) return;

    const ctxRaw = canvasInitial.getContext('2d', { alpha: true });
    if (!ctxRaw) return;

    const ctx: CanvasRenderingContext2D = ctxRaw;

    const MINIMUM_BEAMS = 20;
    const opacityMap: Record<Intensity, number> = {
      subtle: 0.7,
      medium: 0.85,
      strong: 1.0,
    };

    const intensity: Intensity = 'strong';

    let beams: Beam[] = [];
    let rafId = 0;
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;

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

    function updateCanvasSize(canvasEl: HTMLCanvasElement) {
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;

      canvasEl.width = Math.floor(viewportWidth * dpr);
      canvasEl.height = Math.floor(viewportHeight * dpr);

      canvasEl.style.width = '100%';
      canvasEl.style.height = '100%';

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const density = Math.min(
        1.5,
        Math.max(1, (viewportWidth * viewportHeight) / (1280 * 800))
      );
      const total = Math.floor(MINIMUM_BEAMS * density * 1.5);_
