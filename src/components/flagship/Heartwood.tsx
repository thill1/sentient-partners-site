import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FLAGSHIP_RINGS } from '../../content/flagshipContent';

const SIZE = 520;
const CENTER = SIZE / 2;
/** Radius of each plate, heartwood first. */
const RADII = [66, 124, 182, 240];
/** Thickness of a plate, and the distance between the slices that give it an edge. */
const THICKNESS = 34;
const SLICE = 2;
const SLICES = THICKNESS / SLICE;
const COUNT = RADII.length;
const STEP_VH = 62;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** A closed outline with the slow, shared irregularity of a real cross-section. */
function outline(radius: number, seed = 0): string {
  const points: string[] = [];
  for (let step = 0; step < 120; step++) {
    const angle = (step / 120) * Math.PI * 2;
    const wobble =
      1 +
      0.034 * Math.sin(2 * angle + 0.6) +
      0.021 * Math.sin(3 * angle + 2.1) +
      0.011 * Math.sin(5 * angle + 1.3 + seed) +
      0.006 * Math.sin(9 * angle + seed * 2.7);
    const r = radius * wobble;
    points.push(
      `${step === 0 ? 'M' : 'L'}${(CENTER + r * Math.cos(angle) * 1.03).toFixed(1)} ${(CENTER + r * Math.sin(angle) * 0.97).toFixed(1)}`,
    );
  }
  return `${points.join(' ')} Z`;
}

/** The arc a plate's name is set along, on the side that faces the viewer. */
function labelArc(radius: number): string {
  const point = (degrees: number) => {
    const angle = (degrees * Math.PI) / 180;
    return `${(CENTER + radius * Math.cos(angle)).toFixed(1)} ${(CENTER + radius * Math.sin(angle)).toFixed(1)}`;
  };
  return `M${point(190)} A${radius} ${radius} 0 0 0 ${point(50)}`;
}

const PLATES = RADII.map((radius, index) => {
  const inner = index === 0 ? 0 : RADII[index - 1];
  return {
    path: outline(radius),
    grain: Array.from({ length: 7 }, (_, line) => inner + ((line + 1) * (radius - inner)) / 8).map((r, line) =>
      outline(r, index + line * 0.7),
    ),
    arc: labelArc((inner + radius) / 2 - 5),
  };
});

/** Edge colour from the foot of a plate to just under its face. */
const edgeColor = (slice: number) => {
  const t = slice / (SLICES - 1);
  const mix = (from: number, to: number) => Math.round(from + (to - from) * t);
  return `rgb(${mix(150, 226)}, ${mix(120, 204)}, ${mix(70, 160)})`;
};

/**
 * The four ways of working as a redwood grown in front of you. While the
 * page scrolls the scene holds: the heartwood comes first, and each wider
 * ring arrives beneath it until the whole cross-section stands. On small
 * screens the finished form is shown and the list highlights its rings.
 */
export const Heartwood: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [held, setHeld] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // The drawing is built at a fixed size and scaled to the room it has.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => setScale(frame.clientWidth / (SIZE * 1.02));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px) and (min-height: 680px)');
    const apply = () => setHeld(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!held) return;
    const onScroll = () => {
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) return;
      setStep(clamp(Math.floor((-rect.top / travel) * COUNT), 0, COUNT - 1));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [held]);

  const go = (target: number) => {
    const section = sectionRef.current;
    if (!held || !section) {
      setStep(target);
      return;
    }
    const top = section.getBoundingClientRect().top + window.scrollY;
    const travel = section.offsetHeight - window.innerHeight;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: top + ((target + 0.5) / COUNT) * travel, behavior: smooth ? 'smooth' : 'auto' });
  };

  const { rings } = FLAGSHIP_RINGS;
  /** How many rings stand. Small screens always show the whole tree. */
  const grown = held ? step : COUNT - 1;

  return (
    <section
      id="services"
      ref={sectionRef}
      aria-labelledby="services-heading"
      className="relative bg-[#ECE8DF]"
      style={held ? { height: `calc(100vh + ${COUNT * STEP_VH}vh)` } : undefined}
    >
      <div
        className={`overflow-hidden bg-[radial-gradient(120%_90%_at_68%_40%,#FBF9F4_0%,#F1EEE6_45%,#E2DDD1_100%)] ${
          held ? 'sticky top-0 h-screen' : 'relative'
        }`}
      >
        <div className="sp-shell grid h-full items-center gap-6 py-[var(--sp-space)] lg:grid-cols-12 lg:gap-10 lg:pb-10 lg:pt-28">
          <div className="lg:col-span-5">
            <h2 id="services-heading" className="sp-h2 text-sp-navy">
              {FLAGSHIP_RINGS.heading}
            </h2>
            <p className="sp-body mt-5 max-w-[30rem] text-sp-slate">{FLAGSHIP_RINGS.body}</p>

            <ol className="mt-8 space-y-2">
              {rings.map((item, index) => {
                const open = index === step;
                const reached = index <= grown;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => go(index)}
                      className={`w-full rounded-[14px] px-5 py-3 text-left transition-[background-color,color,opacity] duration-500 ${
                        open ? 'bg-sp-navy text-sp-ivory' : 'bg-sp-navy/[0.07] text-sp-navy hover:bg-sp-navy/[0.12]'
                      } ${reached ? 'opacity-100' : 'opacity-55'}`}
                    >
                      <span className="flex items-baseline justify-between gap-4">
                        <span className="font-editorial text-[1.375rem] leading-tight">{item.name}</span>
                        <span className={`shrink-0 text-[13.5px] ${open ? 'text-sp-champagne' : 'text-sp-slate'}`}>{item.place}</span>
                      </span>
                      <span
                        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none ${
                          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                        }`}
                      >
                        <span className="overflow-hidden">
                          <span className="block pt-2 text-[1.0625rem] leading-relaxed">{item.outcome}</span>
                          <span className="block pb-1 pt-1.5 text-[15px] leading-relaxed text-sp-mist">{item.scope}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div aria-hidden="true" className="flex items-center justify-center lg:col-span-7 lg:h-full">
            <div ref={frameRef} className="relative aspect-square w-[min(100%,26rem)] lg:w-[min(100%,74vh)]">
              <div
                className="absolute left-1/2 top-[56%] [transform-style:preserve-3d]"
                style={{
                  width: SIZE,
                  height: SIZE,
                  marginLeft: -SIZE / 2,
                  marginTop: -SIZE / 2,
                  transform: `scale(${scale}) rotateX(58deg) rotateZ(-34deg)`,
                }}
              >
                <svg
                  viewBox={`0 0 ${SIZE} ${SIZE}`}
                  className="absolute inset-0 opacity-30 blur-[18px] transition-transform duration-[1200ms]"
                  style={{ transform: `translate(26px, 30px) scale(${0.34 + 0.22 * grown})` }}
                >
                  <path d={outline(246)} fill="#0D1F4E" />
                </svg>

                {PLATES.map((plate, index) => {
                  const present = index <= grown;
                  const lift = Math.max(0, grown - index) * THICKNESS;
                  const lit = index === step;
                  return (
                    <div
                      key={rings[index].id}
                      className="absolute inset-0 transition-[transform,opacity] duration-[1100ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] [transform-style:preserve-3d] motion-reduce:transition-none"
                      style={{ transform: `translateZ(${present ? lift : -60}px)`, opacity: present ? 1 : 0 }}
                    >
                      {Array.from({ length: SLICES }, (_, slice) => (
                        <svg
                          key={slice}
                          viewBox={`0 0 ${SIZE} ${SIZE}`}
                          className="absolute inset-0"
                          style={{ transform: `translateZ(${slice * SLICE}px)` }}
                        >
                          <path d={plate.path} fill={edgeColor(slice)} />
                        </svg>
                      ))}
                      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0" style={{ transform: `translateZ(${THICKNESS}px)` }}>
                        <path
                          d={plate.path}
                          className="transition-[fill] duration-700"
                          fill={lit ? '#F3DFBB' : '#FBF8F1'}
                          stroke="#C9A96F"
                          strokeWidth={1}
                        />
                        {plate.grain.map((line) => (
                          <path key={line} d={line} fill="none" stroke="#7A5C2E" strokeOpacity={0.2} strokeWidth={0.7} />
                        ))}
                        {index === 0 ? (
                          <circle cx={CENTER} cy={CENTER} r={3} fill="#0D1F4E" />
                        ) : (
                          <>
                            <path id={`heartwood-arc-${index}`} d={plate.arc} fill="none" />
                            <text fontSize={15} letterSpacing={0.6} fill="#0D1F4E" className="font-ui">
                              <textPath href={`#heartwood-arc-${index}`} startOffset="50%" textAnchor="middle">
                                {rings[index].name}
                              </textPath>
                            </text>
                          </>
                        )}
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
