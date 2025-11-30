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

      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16 items-center">
          {/* LEFT: hero content */}
          <div className="lg:col-span-7 xl:col-span-8 text-center lg:text-left">
            <div className="animate-slide-up opacity-0 [animation-delay:200ms] inline-flex">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-brand-50 dark:bg-white/5 text-brand-700 dark:text-brand-300 mb-8 border border-brand-100 dark:border-white/10 backdrop-blur-sm">
                <span className="w-2 h-2 bg-brand-500 rounded-full mr-2 animate-pulse" />
                Accepting New Partners
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-slate-900 dark:text-white mb-8 animate-slide-up opacity-0 [animation-delay:400ms] leading-tight">
              We Build{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-400">
                Sentient Systems
              </span>
              <br />
              That Never Sleep
            </h1>

            <p className="max-w-2xl mx-auto lg:mx-0 text-xl text-slate-600 dark:text-slate-300 mb-10 animate-slide-up opacity-0 [animation-delay:600ms] leading-relaxed">
              Transform your business with AI voice agents, intelligent chatbots,
              and automated revenue systems. No tech expertise required.
            </p>

            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 animate-slide-up opacity-0 [animation-delay:800ms]">
              <Button
                size="lg"
                onClick={() =>
                  document
                    .getElementById('pricing')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                View Plans &amp; Pricing
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={openChat}>
                <PlayCircle className="mr-2 h-5 w-5" />
                Try Interactive Demo
              </Button>
            </div>
          </div>

          {/* RIGHT: contact form */}
          <div className="lg:col-span-5 xl:col-span-4 w-full">
            <div className="animate-slide-up opacity-0 [animation-delay:900ms]">
              <div className="bg-white/80 dark:bg-slate-950/75 border border-slate-200/70 dark:border-white/10 rounded-2xl shadow-xl backdrop-blur-xl p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Get a Custom AI Blueprint
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                  Tell us who you are and what you’re trying to solve. We’ll follow up
                  with a tailored Sentient Partners plan.
                </p>

                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="hero-name"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
                    >
                      Name
                    </label>
                    <input
                      id="hero-name"
                      name="name"
                      type="text"
                      required
                      className="block w-full rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/70 focus:border-brand-500/70"
                      placeholder="Jane Doe"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="hero-email"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
                    >
                      Email
                    </label>
                    <input
                      id="hero-email"
                      name="email"
                      type="email"
                      required
                      className="block w-full rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/70 focus:border-brand-500/70"
                      placeholder="you@company.com"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="hero-message"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
                    >
                      What are you looking to automate?
                    </label>
                    <textarea
                      id="hero-message"
                      name="message"
                      rows={3}
                      className="block w-full rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/70 focus:border-brand-500/70 resize-none"
                      placeholder="Inbound calls, lead follow-up, missed web leads, etc."
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full mt-2"
                  >
                    Submit &amp; Connect
                  </Button>

                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                    No spam. We’ll review your note and respond with specific ideas for
                    your business.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-slate-400 dark:text-slate-600 z-20">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
};
