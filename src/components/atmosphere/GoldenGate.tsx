import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { BOOKING_URL } from "../../content/siteContent";
import { openBookingModal, openSentientChat } from "../../lib/siteActions";
import { HeroClock } from "./HeroClock";
import { ConciergeLauncher } from "../ConciergeLauncher";
// After the shared sheet, so scene rules win over its defaults.
import "./atmosphere.css";
import "./scenes.css";
const Fog = lazy(() => import("./Fog"));
const Traffic = lazy(() => import("./Traffic"));
const Aircraft = lazy(() => import("./Aircraft"));
const Boats = lazy(() => import("./Boats"));
const Ocean = lazy(() => import("./Ocean"));
const Ambience = lazy(() => import("./Ambience"));

// Colour grades for each time of day, cross-faded by `data-scene` on <html>.
const grades = [
  "night-tone",
  "night-deep",
  "day-sky",
  "day-water",
  "day-light",
  "sunset-tone",
  "sunset-glow",
  "sunrise-tone",
  "sunrise-glow",
];

export function GoldenGate() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [enhanced, setEnhanced] = useState(false);
  const [gpu, setGpu] = useState(false);
  // Lazy layers wait for the browser: prerendering cannot suspend on them.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const capable = !media.matches && navigator.hardwareConcurrency > 2;
      setEnhanced(capable);
      setGpu(capable && !!document.createElement("canvas").getContext("webgl"));
    };
    update();
    setMounted(true);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const bounds = element.getBoundingClientRect();
      const p = enhanced
        ? Math.max(
            0,
            Math.min(1, -bounds.top / Math.max(1, bounds.height - innerHeight)),
          )
        : 0;
      progress.current = p;
      element.dataset.phase = p > 0.5 ? "bay" : "opening";
      element.style.setProperty("--descent", String(p));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, [enhanced]);
  return (
    <section
      ref={section}
      className={`golden-gate ${enhanced ? "is-enhanced" : ""}`}
      aria-labelledby="hero-title"
    >
      <div className="scene-sticky">
        <div className="scene" aria-hidden="true">
          <img
            className="scene-poster"
            src="/atmosphere/golden-gate-poster.webp"
            alt=""
            width="1536"
            height="1024"
          />
          {enhanced && (
            <img
              className="scene-bay"
              src="/atmosphere/bay.webp"
              alt=""
              width="1536"
              height="1024"
            />
          )}
          {gpu && (
            <Suspense fallback={null}>
              <Ocean />
            </Suspense>
          )}
          {grades.map((grade) => (
            <div key={grade} className={`scene-grade grade-${grade}`} />
          ))}
          {mounted && (
            <Suspense fallback={null}>
              <Ambience />
            </Suspense>
          )}
          {enhanced && (
            <>
              <Suspense fallback={null}>
                <Aircraft />
                <Boats />
              </Suspense>
              {gpu && (
                <Suspense fallback={null}>
                  <Fog depth={0} progress={progress} />
                </Suspense>
              )}
              <div className="scene-bridge">
                <img
                  src="/atmosphere/bridge.webp"
                  alt=""
                  width="1536"
                  height="1024"
                />
                <Suspense fallback={null}>
                  <Traffic />
                </Suspense>
              </div>
              {gpu && (
                <Suspense fallback={null}>
                  <Fog depth={1} progress={progress} />
                  <Fog depth={2} progress={progress} />
                  <Fog depth={3} progress={progress} />
                </Suspense>
              )}
            </>
          )}
          <div className="scene-shade" />
        </div>
        <HeroClock />
        <div className="hero-copy header-rail">
          <p className="eyebrow hero-eyebrow">Your local business and technology partner</p>
          <h1 id="hero-title">
            <span>Global <br className="hero-mobile-break" />Experience. </span>
            <em>Local <br className="hero-mobile-break" />Impact.</em>
          </h1>
          <p className="hero-description">
            Practical strategy, dependable technology, and{" "}
            <span className="whitespace-nowrap">hands-on</span> partnership for
            growing businesses.
          </p>
          <div className="hero-actions">
            <a
              className="text-link"
              href={BOOKING_URL}
              onClick={(e) => {
                e.preventDefault();
                openBookingModal({
                  source: "Cinematic hero",
                  ctaLabel: "Book a 20-minute introductory call",
                });
              }}
            >
              Book a 20-minute introductory call <ArrowUpRight size={18} />
            </a>
            <a className="text-link" href="#work">
              Explore our work <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
        <div className="descent-note page-width">
          <p>
            Big-picture thinking.
            <br />
            <em>Hands-on execution.</em>
          </p>
          <a href="#perspective" className="text-link">
            Meet your local partner <ArrowDown size={16} />
          </a>
        </div>
        <div className="hero-bottom header-rail">
          <ConciergeLauncher onClick={() => openSentientChat({
            source: "Cinematic hero",
            ctaLabel: "Ask Sentient",
          })} />
        </div>
      </div>
    </section>
  );
}
