import React, { useEffect, useRef, useState } from 'react';
import { CA_ARCHITECTURE } from '../../content/californiaContent';
import { SERVICE_CATALOG } from '../../content/siteContent';
import { Reveal, useInViewOnce } from './primitives';
import { SystemSchematic } from './SystemSchematic';

/**
 * The bridge as structure, not postcard: a bridge drawn in elevation, one tower
 * per layer, beside one continuous "cable" that carries demand through the
 * four layers. The cable draws itself once; then it follows the reader. The lit
 * span, the travelling signal, the filled nodes, and the drawn bridge's towers
 * all track how far down you've read.
 */
export const ConnectionArchitecture: React.FC = () => {
  const { ref, inView } = useInViewOnce<HTMLOListElement>(0.1);
  const stages = CA_ARCHITECTURE.stages;
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [reached, setReached] = useState(-1);
  const [signalY, setSignalY] = useState(0);

  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReached(stages.length - 1);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.58;
      let last = -1;
      itemRefs.current.forEach((li, i) => {
        if (li && li.getBoundingClientRect().top + 24 < line) last = i;
      });
      setReached(last);
      const li = itemRefs.current[Math.max(0, last)];
      if (li) setSignalY(li.offsetTop + 29);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, stages.length]);

  return (
    <section id="system" aria-labelledby="ca-system-heading" className="bg-ca-ivory text-ca-navy">
      <div className="mx-auto grid max-w-[1400px] gap-14 ca-section px-5 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:px-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <Reveal>
              <h2
                id="ca-system-heading"
                className="ca-h2"
              >
                {CA_ARCHITECTURE.heading}
              </h2>
              <p className="mt-7 max-w-[30rem] ca-lede text-ca-navy/70">
                {CA_ARCHITECTURE.body}
              </p>
            </Reveal>
            <Reveal delay={150} className="mt-12">
              <SystemSchematic stages={stages.map((s) => s.name)} reached={reached} />
            </Reveal>
          </div>
        </div>

        <ol ref={ref} className="relative lg:col-span-6 lg:col-start-7" aria-label="Layers of the connected system">
          {/* The cable: a faint full span, and a lit span down to the reader. */}
          <span
            aria-hidden="true"
            className={`absolute bottom-6 left-[5px] top-6 w-px origin-top bg-ca-navy/20 transition-transform duration-[1800ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none ${
              inView ? 'scale-y-100' : 'scale-y-0'
            }`}
          />
          <span
            aria-hidden="true"
            className="absolute left-[5px] top-6 w-px bg-ca-navy transition-[height] duration-500 ease-out motion-reduce:transition-none"
            style={{ height: reached >= 0 ? Math.max(0, signalY - 24) : 0 }}
          />
          {reached >= 0 && (
            <span
              aria-hidden="true"
              className="absolute left-[2px] z-20 block h-[7px] w-[7px] -translate-y-1/2 bg-ca-orange shadow-[0_0_14px_3px_rgba(200,69,43,0.5)] transition-[top] duration-500 ease-out motion-reduce:hidden"
              style={{ top: signalY }}
            />
          )}
          {stages.map((stage, i) => {
            const endpoint = i === 0 || i === stages.length - 1;
            const passed = i <= reached;
            return (
              <li
                key={stage.name}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                aria-current={i === reached ? 'step' : undefined}
                className={`relative grid grid-cols-[auto_1fr] gap-x-7 py-5 transition-[opacity,transform] duration-700 motion-reduce:transition-none sm:py-6 ${
                  inView ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'
                }`}
                style={{ transitionDelay: inView ? `${250 + i * 140}ms` : '0ms' }}
              >
                <span
                  aria-hidden="true"
                  className={`relative z-10 mt-[11px] block h-[11px] w-[11px] border transition-colors duration-500 ${
                    endpoint ? 'border-ca-orange bg-ca-orange' : passed ? 'border-ca-navy bg-ca-navy' : 'border-ca-navy/50 bg-ca-ivory'
                  }`}
                />
                <div>
                  <p className="flex items-baseline gap-3">
                    <span className={`font-mono text-[11px] tabular-nums transition-colors duration-500 ${i === reached ? 'text-ca-rust' : 'text-ca-granite'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-display text-[24px] leading-tight">{stage.name}</span>
                  </p>
                  <p className="mt-3 max-w-[32rem] ca-body text-ca-navy/80">{stage.detail}</p>
                  <p className="mt-3 text-[13px] leading-relaxed text-ca-granite">{stage.scope}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="border-t border-ca-navy/15 pt-6 lg:col-span-12">
          <details id="services" className="group">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-4 rounded-sm text-[15px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-navy [&::-webkit-details-marker]:hidden">
              Explore the services behind the system
              <span aria-hidden="true" className="text-[22px] transition-transform group-open:rotate-45">+</span>
            </summary>
            <dl className="mt-6 grid gap-x-12 md:grid-cols-2">
              {SERVICE_CATALOG.map((service) => (
                <div key={service.id} className="border-t border-ca-navy/15 py-5">
                  <dt className="font-display text-[22px]">{service.title}</dt>
                  <dd className="mt-2 max-w-[38rem] ca-body text-ca-navy/80">{service.description}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>
      </div>
    </section>
  );
};
