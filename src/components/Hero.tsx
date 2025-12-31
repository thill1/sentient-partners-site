import React, { useEffect, useRef, useState } from "react";
import { Button } from "./Button";

type Intensity = "subtle" | "medium" | "strong";

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

    const ctxRaw = canvasInitial.getContext("2d", { alpha: true });
    if (!ctxRaw) return;

    const ctx: CanvasRenderingContext2D = ctxRaw;

    const MINIMUM_BEAMS = 20;
    const opacityMap: Record<Intensity, number> = {
      subtle: 0.7,
      medium: 0.85,
      strong: 1.0,
    };

    const intensity: Intensity = "strong";

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

      canvasEl.style.width = "100%";
      canvasEl.style.height = "100%";

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
      ctx.filter = "blur(35px)";

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
      if (c) updateCanvasSize(c);
    };

    updateCanvasSize(canvasInitial);
    animate();

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize, {
      passive: true,
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
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

const phrases = [
  "AI Receptionists",
  "AI Sales Agents",
  "Smart Websites",
  "AI SEO",
  "AI Reviews",
  "Automated Leads",
  "Automated Workflows",
  "Automated Calendars",
  "AI Chatbots",
  "Always-On Revenue",
];

const Hero: React.FC = () => {
  const openContact = () => {
    window.dispatchEvent(new CustomEvent("open-contact-modal"));
  };

  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    openContact();
  };

  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const scrollToDemo = () => {
    const el = document.getElementById("demo");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToBlueprint = () => {
    const el = document.getElementById("blueprint");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => nameInputRef.current?.focus(), 350);
  };

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, 2500);
    return () => window.clearInterval(interval);
  }, []);

  const currentPhrase = phrases[index];

  return (
    <>
      {/* HERO */}
      <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden py-20 sm:py-24 lg:py-32">
        <ParticleBackground />

        {/* Wider container + generous horizontal padding */}
        <div className="relative z-20 w-full max-w-screen-2xl mx-auto px-6 sm:px-10 lg:px-16">
          {/* Allow more width so the headline can scale up on desktop */}
          <div className="w-full max-w-6xl mx-auto">
            <div className="text-center min-w-0">
              <div className="animate-slide-up opacity-0 [animation-delay:200ms] inline-flex mb-7 sm:mb-8">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-brand-50 dark:bg-white/5 text-brand-700 dark:text-brand-300 border border-brand-100 dark:border-white/10 backdrop-blur-sm">
                  <span className="w-2 h-2 bg-brand-500 rounded-full mr-2 animate-pulse" />
                  Accepting New Partners
                </span>
              </div>

              {/* Bigger desktop headline */}
              <h1 className="min-w-0 text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-display font-bold tracking-tight text-slate-900 dark:text-white mb-9 sm:mb-11 animate-slide-up opacity-0 [animation-delay:400ms] leading-[1.03] overflow-visible">
                <span className="block">We Build</span>

                <span
                  className="block min-w-0 max-w-full text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-400 leading-[1.03] pb-[0.14em]"
                  title={currentPhrase}
                >
                  {currentPhrase}
                </span>

                <span className="block">That Never Sleep</span>
              </h1>

              {/* Removed "No tech expertise required." */}
              <p className="max-w-4xl mx-auto text-xl sm:text-[1.35rem] lg:text-2xl text-slate-600 dark:text-slate-300 mb-11 sm:mb-14 animate-slide-up opacity-0 [animation-delay:600ms] leading-relaxed">
                Transform your business with AI voice agents, intelligent
                chatbots, and automated revenue systems.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center animate-slide-up opacity-0 [animation-delay:750ms]">
                <button
                  type="button"
                  onClick={scrollToDemo}
                  className="inline-flex items-center justify-center rounded-2xl px-7 py-4 text-sm sm:text-base font-semibold
                             bg-slate-900 text-white hover:bg-slate-800
                             dark:bg-white/10 dark:hover:bg-white/15 dark:text-white
                             border border-slate-900/10 dark:border-white/10 backdrop-blur"
                >
                  Interactive Demo
                </button>

                <button
                  type="button"
                  onClick={scrollToBlueprint}
                  className="inline-flex items-center justify-center rounded-2xl px-7 py-4 text-sm sm:text-base font-semibold
                             bg-white/85 hover:bg-white text-slate-900
                             dark:bg-slate-950/55 dark:hover:bg-slate-950/70 dark:text-white
                             border border-slate-200/70 dark:border-white/10 backdrop-blur"
                >
                  Get Blueprint
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEMO + BLUEPRINT FORM (aligned cards) */}
      <section id="demo" className="relative z-20 w-full py-14 sm:py-16">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-10 items-stretch">
            {/* LEFT: Demo card */}
            <div className="lg:col-span-7 xl:col-span-8">
              <div className="h-full flex flex-col rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-slate-950/75 shadow-xl backdrop-blur-xl p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Interactive Demo
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      Place your embedded agent/video here. Keep it short and
                      high impact.
                    </p>
                  </div>
                  <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-700 dark:bg-white/5 dark:text-brand-300 border border-brand-100 dark:border-white/10">
                    60 sec
                  </span>
                </div>

                <div className="mt-4 flex-1 rounded-2xl border border-slate-200/70 dark:border-white/10 overflow-hidden bg-black/90">
                  <div className="h-full min-h-[240px] sm:min-h-[320px] w-full flex items-center justify-center text-white/80">
                    <span className="text-sm font-semibold">
                      Embed demo widget / video here
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-700 dark:text-slate-200/80">
                  <div className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-950/40 px-3 py-2">
                    Answers 24/7
                  </div>
                  <div className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-950/40 px-3 py-2">
                    Qualifies leads
                  </div>
                  <div className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-950/40 px-3 py-2">
                    Books calls
                  </div>
                  <div className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-950/40 px-3 py-2">
                    Syncs to CRM
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Blueprint card */}
            <div id="blueprint" className="lg:col-span-5 xl:col-span-4 w-full">
              <div className="h-full flex flex-col rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-slate-950/75 shadow-xl backdrop-blur-xl p-6 sm:p-8">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Get a Custom AI Blueprint
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                  Tell us who you are and what you’re trying to solve. We’ll
                  follow up with a tailored Sentient Partners plan.
                </p>

                <form
                  onSubmit={handleContactSubmit}
                  className="space-y-4 flex-1 flex flex-col"
                >
                  <div>
                    <label
                      htmlFor="hero-name"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
                    >
                      Name
                    </label>
                    <input
                      ref={nameInputRef}
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

                  <div className="mt-auto">
                    <Button type="submit" size="lg" className="w-full mt-2">
                      Submit &amp; Connect
                    </Button>

                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                      No spam. We’ll review your note and respond with specific
                      ideas for your business.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;
export { Hero };
