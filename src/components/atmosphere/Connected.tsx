import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { ease, loadFabric, type Fabric } from "../../fabric/motion";
import "./sections.css";

const stages = [
  ["Inquiry", "Capture the question and the context."],
  ["Booking", "Find a time. Confirm the details."],
  ["Service", "Give your team what they need."],
  ["Billing", "Prepare an accurate invoice for review."],
  ["Follow-up", "Keep the relationship moving forward."],
];
const STAGED = "(min-width: 900px) and (min-height: 640px)";
// The journey hangs like a bridge cable: each stop sits on the curve's sag.
const sag = stages.map((_, i) => {
  const t = i / (stages.length - 1);
  return 4 * t * (1 - t);
});

export function Connected() {
  const [stage, setStage] = useState(0);
  const root = useRef<HTMLElement>(null);
  const fabric = useRef<Fabric | null>(null);
  const range = useRef<{ start: number; end: number } | null>(null);
  const current = useRef(0);

  const go = (i: number) => {
    const r = range.current;
    const lenis = fabric.current?.lenis;
    if (r && lenis && matchMedia(STAGED).matches) {
      const slot = (r.end - r.start) / stages.length;
      lenis.scrollTo(r.start + slot * (i + 0.5), { duration: 1 });
    }
    setStage(i);
  };

  useEffect(() => {
    current.current = stage;
  }, [stage]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let ctx: { revert: () => void } | undefined;
    let alive = true;
    loadFabric().then((f) => {
      if (!f || !alive) return;
      fabric.current = f;
      ctx = f.gsap.context(() => {
        const q = f.gsap.utils.selector(el);
        const mm = f.gsap.matchMedia();
        const path = el.querySelector(".cn-cable-lit");
        f.gsap.set(path, { strokeDasharray: 1, strokeDashoffset: 1 });
        mm.add(STAGED, () => {
          const st = f.ScrollTrigger.create({
            trigger: el,
            start: "top top",
            end: "bottom bottom",
            onUpdate: (self) => {
              const next = Math.min(
                stages.length - 1,
                Math.floor(self.progress * stages.length),
              );
              if (next !== current.current) setStage(next);
            },
            onRefresh: (self) => {
              range.current = { start: self.start, end: self.end };
            },
          });
          range.current = { start: st.start, end: st.end };
          f.gsap
            .timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: el,
                start: "top top",
                end: "bottom bottom",
                scrub: 0.6,
              },
            })
            .to(path, { strokeDashoffset: 0, duration: 1 }, 0)
            .fromTo(
              q(".cn-glow"),
              { xPercent: -30 },
              { xPercent: 30, duration: 1 },
              0,
            );
          return () => {
            st.kill();
            range.current = null;
          };
        });
        mm.add(`not all and ${STAGED}`, () => {
          f.gsap.to(path, {
            strokeDashoffset: 0,
            duration: 2.2,
            ease: ease.inOut,
            scrollTrigger: {
              trigger: q(".journey-line")[0],
              start: "top 80%",
              once: true,
            },
          });
        });
      }, el);
    });
    return () => {
      alive = false;
      ctx?.revert();
    };
  }, []);

  // Each step's detail rises in as the journey reaches it.
  useEffect(() => {
    const f = fabric.current;
    const el = root.current;
    if (!f || !el) return;
    const tw = f.gsap.fromTo(
      el.querySelectorAll(".journey-detail > span, .journey-detail p"),
      { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.6, ease: ease.out },
    );
    return () => {
      tw.kill();
    };
  }, [stage]);

  return (
    <section
      ref={root}
      className="connected-section connected-v2 section-space"
    >
      <div className="cn-stage">
        <div className="cn-glow" aria-hidden="true" />
        <div className="page-width connected-inner">
          <div>
            <p className="eyebrow">Connected intelligence</p>
            <h2>
              Less friction.
              <br />
              <em>More forward.</em>
            </h2>
            <p>
              When your systems work together, your people can focus on the work
              that matters. We connect the journey, with you in control.
            </p>
          </div>
          <div className="connection-story">
            <div className="journey-line">
              <svg
                className="cn-cable"
                viewBox="0 0 1000 60"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path className="cn-cable-base" d="M70 0 Q500 80 930 0" />
                <path
                  className="cn-cable-lit"
                  d="M70 0 Q500 80 930 0"
                  pathLength={1}
                />
              </svg>
              {stages.map(([name], i) => (
                <button
                  key={name}
                  aria-pressed={stage === i}
                  onClick={() => go(i)}
                  style={{ "--sag": sag[i] } as React.CSSProperties}
                >
                  <span>{i < stage ? <Check size={15} /> : i + 1}</span>
                  <strong>{name}</strong>
                </button>
              ))}
            </div>
            <div className="journey-detail" aria-live="polite">
              <span>{stages[stage][0]}</span>
              <p>{stages[stage][1]}</p>
              <button
                aria-label="Explore next workflow step"
                onClick={() => go((stage + 1) % stages.length)}
              >
                <ArrowRight size={20} />
              </button>
            </div>
            <small>Connected systems. Clear handoffs. Human oversight.</small>
          </div>
        </div>
      </div>
    </section>
  );
}
