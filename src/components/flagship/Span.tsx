import React, { useEffect, useRef, useState } from 'react';
import { HOME_PROCESS } from '../../content/homeContent';
import { FLAGSHIP_SPAN } from '../../content/flagshipContent';

/** Suspenders between the main cable and the deck, across a 1200-wide drawing. */
const CABLE = 'M0 150 L200 26 Q600 236 1000 26 L1200 150';
const cableY = (x: number) => {
  if (x <= 200) return 150 - (124 * x) / 200;
  if (x >= 1000) return 26 + (124 * (x - 1000)) / 200;
  const t = (x - 200) / 800;
  return (1 - t) * (1 - t) * 26 + 2 * (1 - t) * t * 236 + t * t * 26;
};
const SUSPENDERS = Array.from({ length: 29 }, (_, index) => 40 + index * 40).filter((x) => x !== 200 && x !== 1000);
const STATIONS = [150, 450, 750, 1050];

/**
 * The approach as a bridge in elevation: four steps hung from one cable.
 * The cable draws once when the section comes into view.
 */
export const Span: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDrawn(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDrawn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="approach" aria-labelledby="approach-heading" className="sp-section bg-sp-cream">
      <div className="sp-shell">
        <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-12">
          <h2 id="approach-heading" className="sp-h2 text-sp-navy lg:col-span-7">
            {FLAGSHIP_SPAN.heading}
          </h2>
          <p className="sp-lede text-sp-ink lg:col-span-5">{FLAGSHIP_SPAN.body}</p>
        </div>

        <div ref={ref} className="mt-10 lg:mt-14">
          <svg viewBox="0 0 1200 190" aria-hidden="true" className="hidden w-full text-sp-navy sm:block" fill="none">
            <g
              stroke="currentColor"
              strokeWidth={1}
              className={`transition-opacity duration-[1400ms] ${drawn ? 'opacity-40 delay-[1100ms]' : 'opacity-0'}`}
            >
              {SUSPENDERS.map((x) => (
                <line key={x} x1={x} y1={cableY(x)} x2={x} y2={170} />
              ))}
            </g>
            <path
              d={CABLE}
              stroke="currentColor"
              strokeWidth={1.6}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={drawn ? 0 : 1}
              className="transition-[stroke-dashoffset] duration-[2400ms] ease-[cubic-bezier(0.3,0.6,0.2,1)]"
            />
            <g stroke="currentColor" strokeWidth={2.4}>
              <line x1={200} y1={20} x2={200} y2={186} />
              <line x1={1000} y1={20} x2={1000} y2={186} />
            </g>
            <line x1={0} y1={170} x2={1200} y2={170} stroke="currentColor" strokeWidth={1.6} />
            {STATIONS.map((x) => (
              <circle key={x} cx={x} cy={170} r={5} className="fill-sp-cream" stroke="#7A5C2E" strokeWidth={1.6} />
            ))}
          </svg>

          <ol className="mt-2 grid gap-x-10 gap-y-8 sm:grid-cols-4 sm:gap-x-0 sm:text-center">
            {HOME_PROCESS.steps.map((step, index) => (
              <li key={step.name} className="border-t border-sp-navy/25 pt-5 sm:border-0 sm:px-5 sm:pt-4">
                <span aria-hidden="true" className="font-editorial text-[1.5rem] leading-none text-sp-bronze">
                  {index + 1}
                </span>
                <h3 className="sp-h3 mt-2 text-sp-navy">{step.name}</h3>
                <p className="sp-body mt-2.5 text-sp-slate">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};
