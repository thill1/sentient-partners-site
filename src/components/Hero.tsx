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
      const total = Math.floor(MINIMUM_BEAMS * density * 1.5);

      beams = Array.from({ length: total }, () =>
        createBeam(viewportWidth, viewportHeight)
      );
    }

    function drawBeam(c: CanvasRenderingContext2D, beam: Beam) {
      c.save();
      c.translate(beam.x, beam.y);
      c.rotate((beam.angle * Math.PI) / 180);

      const opacityMap: Record<Intensity, number> = {
        subtle: 0.7,
        medium: 0.85,
        strong: 1.0,
      };
      const intensity: Intensity = 'strong';

      const pulsingOpacity =
        beam.opacity *
        (0.8 + Math.sin(beam.pulse) * 0.2) *
        opacityMap[intensity];

      const gradient = c.createLinearGradient(0, 0, 0, beam.length);
      gradient.addColorStop(0, `hsla(${beam.hue},85%,65%,0)`);
      gradient.addColorStop(
        0.1,
        `hsla(${beam.hue},85%,65%,${pulsingOpacity * 0.5})`
      );
      gradient.addColorStop(
        0.4,
        `hsla(${beam.hue},85%,65%,${pulsingOpacity})`
      );
      gradient.addColorStop(
        0.6,
        `hsla(${beam.hue},85%,65%,${pulsingOpacity})`
      );
      gradient.addColorStop(
        0.9,
        `hsla(${beam.hue},85%,65%,${pulsingOpacity * 0.5})`
      );
      gradient.addColorStop(1, `hsla(${beam.hue},85%,65%,0)`);

      c.fillStyle = gradient;
      c.fillRect(-beam.width / 2, 0, beam.width, beam.length);
      c.restore();
    }

    function animate() {
      ctx.clearRect(0, 0, viewportWidth, viewportHeight);
      ctx.filter = 'blur(35px)';

      const total = beams.length;
      for (let i = 0; i < total; i++) {
        const b = beams[i];
        b.y -= b.speed;
        b.pulse += b.pulseSpeed;

        if (b.y + b.length < -100) {
          resetBeam(b, i, total, viewportWidth, viewportHeight);
        }
        drawBeam(ctx, b);
      }

      rafId = requestAnimationFrame(animate);
    }

    const handleResize = () => {
      const c = canvasRef.current;
      if (c) {
        updateCanvasSize(c);
      }
    };

    updateCanvasSize(canvasInitial);
    animate();

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, {
      passive: true,
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none">
      <div className="absolute inset-0 bg-white dark:bg-dark-bg transition-colors duration-500" />

      <div className="absolute inset-0">
        <div className="relative w-full h-full">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            aria-hidden="true"
          />
          <div className="absolute inset-0 backdrop-blur-3xl animate-pulse [animation-duration:8s] bg-neutral-950/5" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t to-transparent from-white/80 dark:from-neutral-950" />
            <div className="absolute -inset-[25%] bg-[radial-gradient(60%_60%_at_50%_40%,rgba(56,189,248,0.28),transparent)]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const Hero: React.FC = () => {
  const openChat = () => {
    window.dispatchEvent(new CustomEvent('open-sentient-chat'));
  };

  const openContact = () => {
    window.dispatchEvent(new CustomEvent('open-contact-modal'));
  };

  const handleContactSubmit = (e: any) => {
    e.preventDefault();
    openContact();
  };

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden pt-32 pb-20">
      <ParticleBackground />

      <div className="relative z-20 w-full max-w-7xl mx-auto
