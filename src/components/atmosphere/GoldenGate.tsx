import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Pause, Play } from "lucide-react";
import { BOOKING_URL } from "../../content/siteContent";
import { openBookingModal } from "../../lib/siteActions";
const Fog = lazy(() => import("./Fog"));

export function GoldenGate() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [enhanced, setEnhanced] = useState(false);
  const [gpu, setGpu] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = matchMedia("(min-width: 761px)");
    const update = () => {
      const capable = !media.matches && navigator.hardwareConcurrency > 2;
      setEnhanced(capable);
      setGpu(capable && desktop.matches);
    };
    update();
    media.addEventListener("change", update);
    desktop.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      desktop.removeEventListener("change", update);
    };
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
      className={`golden-gate ${enhanced ? "is-enhanced" : ""} ${paused ? "is-paused" : ""}`}
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
            <>
              <img
                className="scene-bay"
                src="/atmosphere/bay.webp"
                alt=""
                width="1536"
                height="1024"
              />
              {gpu && (
                <Suspense fallback={null}>
                  <Fog depth={0} progress={progress} paused={paused} />
                </Suspense>
              )}
              <div className="scene-bridge">
                <img
                  src="/atmosphere/bridge.webp"
                  alt=""
                  width="1536"
                  height="1024"
                />
                <svg className="scene-traffic" viewBox="0 0 1536 1024">
                  <g fill="#f7ddaa">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <circle key={i} r="1.2">
                        <animateMotion
                          dur={`${41 + i * 7}s`}
                          begin={`${-i * 9}s`}
                          repeatCount="indefinite"
                          path="M 493 323 Q 800 413 1400 767"
                        />
                      </circle>
                    ))}
                  </g>
                </svg>
              </div>
              <div className="bay-boat boat-one">
                <span />
              </div>
              <div className="bay-boat boat-two">
                <span />
              </div>
              {gpu && (
                <Suspense fallback={null}>
                  <Fog depth={1} progress={progress} paused={paused} />
                </Suspense>
              )}
            </>
          )}
          <div className="scene-shade" />
        </div>
        <div className="hero-copy page-width">
          <p className="eyebrow">
            Strategy <span> / </span> Intelligence <span> / </span> Results
          </p>
          <h1 id="hero-title">
            Experience
            <br /> earned globally.
            <br /> <em>Applied locally.</em>
          </h1>
          <p className="hero-description">
            Decades of experience leading teams of thousands and
            mission-critical operations worldwide. Today, we bring that
            expertise, perspective, and discipline to the businesses we serve.
          </p>
          <div className="hero-actions">
            <a
              className="button button-light"
              href={BOOKING_URL}
              onClick={(e) => {
                e.preventDefault();
                openBookingModal({
                  source: "Cinematic hero",
                  ctaLabel: "Book a Conversation",
                });
              }}
            >
              Book a Conversation <ArrowUpRight size={17} />
            </a>
            <a className="text-link" href="#work">
              Explore Our Work <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
        <div className="descent-note page-width">
          <p className="eyebrow">Perspective changes everything.</p>
          <p>
            Big-picture thinking.
            <br />
            <em>Down-to-earth partnership.</em>
          </p>
          <a href="#perspective" className="text-link">
            Meet your local partner <ArrowDown size={16} />
          </a>
        </div>
        <div className="hero-bottom page-width">
          <a href="#perspective" className="scroll-cue">
            <ArrowDown size={14} /> A different perspective
          </a>
          <span className="scene-location">
            Northern California. Rooted here.
          </span>
          {enhanced && (
            <button
              className="motion-toggle"
              onClick={() => setPaused(!paused)}
              aria-label={paused ? "Play atmosphere" : "Pause atmosphere"}
            >
              {paused ? <Play size={13} /> : <Pause size={13} />}
              <span>{paused ? "Play" : "Pause"} atmosphere</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
