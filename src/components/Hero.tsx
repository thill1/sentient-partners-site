import React, { useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { HERO_CONTENT } from "../content/siteContent";
import { dispatchToast, submitLead } from "../services/geminiService";

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
        hue: 222 + Math.random() * 16,
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
      beam.hue = 222 + (index * 16) / totalBeams;
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
    window.addEventListener("orientationchange", handleResize, { passive: true });

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

const Hero: React.FC = () => {
  const [blueprintForm, setBlueprintForm] = useState({
    name: "",
    email: "",
    inquiry: "",
  });
  const [isSubmittingBlueprint, setIsSubmittingBlueprint] = useState(false);
  const [blueprintSubmitted, setBlueprintSubmitted] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      isSubmittingBlueprint ||
      !blueprintForm.name.trim() ||
      !blueprintForm.email.trim() ||
      !blueprintForm.inquiry.trim()
    ) {
      return;
    }

    setIsSubmittingBlueprint(true);

    const result = await submitLead({
      name: blueprintForm.name.trim(),
      email: blueprintForm.email.trim(),
      inquiry: blueprintForm.inquiry.trim(),
      intent: "blueprint",
      source: "Hero Blueprint Form",
      ctaLabel: "Submit & Connect",
    });

    setIsSubmittingBlueprint(false);

    if (result.success) {
      setBlueprintSubmitted(true);
      setBlueprintForm({ name: "", email: "", inquiry: "" });
      dispatchToast(result.message, "success");
      return;
    }

    dispatchToast(result.message || "Failed to send blueprint request.", "error");
  };

  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBlueprint = () => {
    const el = document.getElementById("blueprint");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => nameInputRef.current?.focus(), 350);
  };

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % HERO_CONTENT.rotatingPhrases.length);
    }, 2500);
    return () => window.clearInterval(interval);
  }, []);

  const currentPhrase = HERO_CONTENT.rotatingPhrases[index];

  return (
    <>
      {/* HERO */}
      <section className="relative w-full min-h-[76svh] sm:min-h-[88vh] flex items-center justify-center overflow-hidden py-14 sm:py-24 lg:py-32">
        <ParticleBackground />

        <div className="relative z-20 w-full max-w-screen-2xl mx-auto px-6 sm:px-10 lg:px-14">
          <div className="w-full max-w-6xl mx-auto">
            <div className="text-center min-w-0">
              <div className="animate-slide-up opacity-0 [animation-delay:200ms] inline-flex mb-6 sm:mb-7">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-brand-50 dark:bg-white/5 text-brand-700 dark:text-brand-300 border border-brand-100 dark:border-white/10 backdrop-blur-sm">
                  <span className="w-2 h-2 bg-brand-500 rounded-full mr-2 animate-pulse" />
                  {HERO_CONTENT.badge}
                </span>
              </div>

              <h1 className="min-w-0 text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight text-slate-900 dark:text-white mb-6 sm:mb-10 animate-slide-up opacity-0 [animation-delay:400ms] leading-[1.03] overflow-visible">
                <span className="block">{HERO_CONTENT.headingPrefix}</span>

                <span
                  className="block min-w-0 max-w-full text-transparent bg-clip-text bg-gradient-to-r from-brand-800 to-brand-500 dark:from-brand-200 dark:to-brand-400 leading-[1.03] pb-[0.14em]"
                  title={currentPhrase}
                >
                  {currentPhrase}
                </span>

                <span className="block">{HERO_CONTENT.headingSuffix}</span>
              </h1>

              <p className="max-w-4xl mx-auto text-lg sm:text-2xl text-slate-600 dark:text-slate-300 mb-8 sm:mb-12 animate-slide-up opacity-0 [animation-delay:600ms] leading-relaxed">
                {HERO_CONTENT.subtitle}
              </p>

              <div className="flex justify-center animate-slide-up opacity-0 [animation-delay:750ms]">
                <button
                  type="button"
                  onClick={() => {
                    scrollToBlueprint();
                    window.setTimeout(() => nameInputRef.current?.focus(), 450);
                  }}
                  className="inline-flex items-center justify-center rounded-2xl px-8 py-4 text-sm sm:text-base font-semibold
                             bg-white/85 hover:bg-white text-slate-900
                             dark:bg-slate-950/55 dark:hover:bg-slate-950/70 dark:text-white
                             border border-slate-200/70 dark:border-white/10 backdrop-blur"
                >
                  {HERO_CONTENT.quickStartLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BLUEPRINT FORM ONLY */}
      <section id="blueprint" className="relative z-20 w-full py-14 sm:py-16">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-slate-950/75 shadow-xl backdrop-blur-xl p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {HERO_CONTENT.blueprintTitle}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              {HERO_CONTENT.blueprintDescription}
            </p>

            <form onSubmit={handleContactSubmit} className="space-y-4 flex flex-col">
              {blueprintSubmitted && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {HERO_CONTENT.blueprintSuccess}
                </div>
              )}
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
                  value={blueprintForm.name}
                  onChange={(e) => {
                    setBlueprintSubmitted(false);
                    setBlueprintForm((prev) => ({ ...prev, name: e.target.value }));
                  }}
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
                  value={blueprintForm.email}
                  onChange={(e) => {
                    setBlueprintSubmitted(false);
                    setBlueprintForm((prev) => ({ ...prev, email: e.target.value }));
                  }}
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
                  required
                  value={blueprintForm.inquiry}
                  onChange={(e) => {
                    setBlueprintSubmitted(false);
                    setBlueprintForm((prev) => ({ ...prev, inquiry: e.target.value }));
                  }}
                  className="block w-full rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/70 focus:border-brand-500/70 resize-none"
                  placeholder="Inbound calls, lead follow-up, missed web leads, etc."
                />
              </div>

              <div className="mt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmittingBlueprint}
                >
                  {isSubmittingBlueprint ? "Submitting..." : "Submit & Connect"}
                </Button>

                <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                  {HERO_CONTENT.blueprintDisclaimer}
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;
export { Hero };
