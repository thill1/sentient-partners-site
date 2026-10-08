import React, { useState } from 'react';
import { FLAGSHIP_RINGS } from '../../content/flagshipContent';

const SIZE = 520;
const CENTER = SIZE / 2;
/** Outer edge of each of the four bands, heartwood first. */
const EDGES = [64, 122, 180, 238];

/** A closed ring with the slow, shared irregularity of a real cross-section. */
function ring(radius: number, seed = 0): string {
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
    const x = CENTER + r * Math.cos(angle) * 1.03;
    const y = CENTER + r * Math.sin(angle) * 0.97;
    points.push(`${step === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `${points.join(' ')} Z`;
}

const BANDS = EDGES.map((edge, index) => `${ring(edge)} ${index > 0 ? ring(EDGES[index - 1]) : ''}`);
/** The fine annual rings between the four bands. */
const GRAIN = Array.from({ length: 25 }, (_, index) => 12 + index * 9.3).filter(
  (radius) => radius < EDGES[3] - 4 && EDGES.every((edge) => Math.abs(edge - radius) > 3),
);

/**
 * The four ways of working, drawn as a redwood's rings: advisory is the
 * heartwood and the customer-facing work is the outer ring. The list is the
 * control; the drawing follows it.
 */
export const Rings: React.FC = () => {
  const [active, setActive] = useState(0);
  const { rings } = FLAGSHIP_RINGS;

  return (
    <section id="services" aria-labelledby="services-heading" className="sp-section bg-sp-cream">
      <div className="sp-shell">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-12">
          <h2 id="services-heading" className="sp-h2 text-sp-navy lg:col-span-7">
            {FLAGSHIP_RINGS.heading}
          </h2>
          <p className="sp-lede text-sp-ink lg:col-span-5">{FLAGSHIP_RINGS.body}</p>
        </div>

        <div className="mt-10 grid items-center gap-8 lg:mt-14 lg:grid-cols-12 lg:gap-14">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            aria-hidden="true"
            className="mx-auto w-full max-w-[22rem] lg:col-span-5 lg:max-w-none"
          >
            {BANDS.map((path, index) => (
              <path
                key={rings[index].id}
                d={path}
                fillRule="evenodd"
                onMouseEnter={() => setActive(index)}
                onClick={() => setActive(index)}
                className={`cursor-pointer transition-[fill] duration-500 ${
                  index === active ? 'fill-sp-champagne/55' : 'fill-transparent hover:fill-sp-champagne/15'
                }`}
              />
            ))}
            {GRAIN.map((radius, index) => (
              <path key={radius} d={ring(radius, index * 0.7)} fill="none" className="pointer-events-none stroke-sp-bronze/25" strokeWidth={0.7} />
            ))}
            {EDGES.map((edge) => (
              <path key={edge} d={ring(edge)} fill="none" className="pointer-events-none stroke-sp-navy/70" strokeWidth={1.3} />
            ))}
            <circle cx={CENTER} cy={CENTER} r={3} className="pointer-events-none fill-sp-navy" />
          </svg>

          <ol className="border-t border-sp-navy/20 lg:col-span-7">
            {rings.map((item, index) => {
              const selected = index === active;
              return (
                <li key={item.id} className="border-b border-sp-navy/20">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setActive(index)}
                    onMouseEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    className="grid w-full gap-x-8 gap-y-1 py-5 text-left sm:grid-cols-12 lg:py-6"
                  >
                    <span className="sm:col-span-5">
                      <span
                        className={`block text-[14px] transition-colors duration-300 ${selected ? 'text-sp-bronze' : 'text-sp-slate'}`}
                      >
                        {item.place}
                      </span>
                      <span className="sp-h3 mt-1 block text-sp-navy">{item.name}</span>
                    </span>
                    <span className="sm:col-span-7">
                      <span className={`sp-body block transition-colors duration-300 ${selected ? 'text-sp-ink' : 'text-sp-slate'}`}>
                        {item.outcome}
                      </span>
                      <span className="mt-2 block text-[15px] leading-relaxed text-sp-slate">{item.scope}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
};
