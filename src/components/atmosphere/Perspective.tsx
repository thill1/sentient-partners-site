import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  duration,
  ease,
  loadFabric,
  revealText,
  stickySequence,
} from "../../fabric/motion";
import "./perspective.css";

const lines = [
  { text: "The discipline of", em: false },
  { text: "proven technology.", em: false },
  { text: "The commitment", em: true },
  { text: "of a local partner.", em: true },
];

/**
 * The first section after the hero: the bridge dissolves into fog, the camera
 * settles over Bay water, and the headline surfaces line by line as you
 * scroll. A tall track with a sticky stage keeps its size fixed from first
 * paint; without motion it renders as a still composition.
 */
export default function Perspective() {
  const track = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let ctx: { revert: () => void } | undefined;
    let alive = true;
    loadFabric().then((f) => {
      if (!f || !alive) return;
      ctx = f.gsap.context(() => {
        const q = f.gsap.utils.selector(el);
        const mm = f.gsap.matchMedia();
        mm.add("(min-width: 900px) and (min-height: 640px)", () => {
          f.gsap.set(q(".pv-line"), { yPercent: 115, rotate: 2 });
          f.gsap.set(q(".pv-copy > *"), { autoAlpha: 0, y: 28 });
          stickySequence(f, el, (tl) => {
            tl.fromTo(
              q(".pv-water"),
              { scale: 1.22, yPercent: 6 },
              { scale: 1, yPercent: -4, duration: 1 },
              0,
            )
              .fromTo(
                q(".pv-fog-near"),
                { xPercent: -8, autoAlpha: 0.9 },
                { xPercent: 10, autoAlpha: 0.35, duration: 1 },
                0,
              )
              .fromTo(
                q(".pv-fog-far"),
                { xPercent: 6 },
                { xPercent: -8, duration: 1 },
                0,
              )
              .to(
                q(".pv-line"),
                {
                  yPercent: 0,
                  rotate: 0,
                  stagger: 0.07,
                  duration: 0.22,
                  ease: ease.soft,
                },
                0.06,
              )
              .to(
                q(".pv-copy > *"),
                {
                  autoAlpha: 1,
                  y: 0,
                  stagger: 0.05,
                  duration: 0.16,
                  ease: ease.soft,
                },
                0.42,
              )
              .fromTo(
                q(".pv-rule"),
                { scaleX: 0 },
                { scaleX: 1, duration: 0.3 },
                0.5,
              )
              .to(q(".pv-headline"), { yPercent: -6, duration: 0.25 }, 0.75)
              .to(q(".pv-dusk"), { autoAlpha: 1, duration: 0.25 }, 0.75);
          });
        });
        mm.add("(max-width: 899px), (max-height: 639px)", () => {
          q<HTMLElement>(".pv-reveal").forEach((node, i) =>
            revealText(f, node, { delay: i * 0.05 }),
          );
          f.gsap.from(q(".pv-copy > :not(.pv-reveal)"), {
            autoAlpha: 0,
            y: 24,
            stagger: duration.stagger,
            scrollTrigger: {
              trigger: q(".pv-copy")[0],
              start: "top 85%",
              once: true,
            },
          });
          f.gsap.fromTo(
            q(".pv-water"),
            { yPercent: -6, scale: 1.12 },
            {
              yPercent: 6,
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        });
      }, el);
    });
    return () => {
      alive = false;
      ctx?.revert();
    };
  }, []);

  return (
    <section
      ref={track}
      id="perspective"
      className="perspective-v2"
      aria-labelledby="perspective-title"
    >
      <div className="pv-seam" aria-hidden="true">
        <span className="pv-seam-fog pv-seam-fog-a" />
        <span className="pv-seam-fog pv-seam-fog-b" />
      </div>
      <div className="pv-stage">
        <div className="pv-layers" aria-hidden="true">
          <div className="pv-water" />
          <div className="pv-fog-far" />
          <div className="pv-fog-near" />
          <div className="pv-dusk" />
        </div>
        <div className="pv-content page-width">
          <p className="eyebrow pv-eyebrow">Perspective</p>
          <h2 id="perspective-title" className="pv-headline">
            {lines.map((line) => (
              <span key={line.text} className="f-line-mask">
                <span className="f-line pv-line">
                  {line.em ? <em>{line.text}</em> : line.text}
                </span>
              </span>
            ))}
          </h2>
          <div className="pv-copy">
            <span className="pv-rule" aria-hidden="true" />
            <p className="lead-copy pv-reveal">
              Seasoned experience.
              <br />
              Built for your business.
            </p>
            <p className="pv-reveal">
              Growing businesses deserve the same thoughtful strategy, reliable
              systems, and disciplined execution as anyone.
            </p>
            <p className="pv-reveal">
              We make that expertise practical. From Auburn and Placer County to
              Greater Sacramento and beyond, we help you connect the right
              technology to the work you do every day.
            </p>
            <a className="text-link" href="#founder">
              The experience behind the partnership <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
        <p className="pv-places" aria-hidden="true">
          <span>Auburn</span>
          <span>Placer County</span>
          <span>Greater Sacramento</span>
        </p>
      </div>
    </section>
  );
}
