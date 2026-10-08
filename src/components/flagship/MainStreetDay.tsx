import React, { useEffect, useRef, useState } from 'react';
import { FLAGSHIP_DAY, FLAGSHIP_MOMENTS } from '../../content/flagshipContent';
import type { CapabilityId } from '../../content/homeContent';
import { Arrow } from '../home/Arrow';
import { AnalyticsDemo } from '../home/cards/AnalyticsDemo';
import { AppsDemo } from '../home/cards/AppsDemo';
import { ChatDemo } from '../home/cards/ChatDemo';
import { CrmDemo } from '../home/cards/CrmDemo';
import { ReputationDemo } from '../home/cards/ReputationDemo';
import { Stage } from '../home/cards/Stage';
import { VoiceDemo } from '../home/cards/VoiceDemo';
import { WebDemo } from '../home/cards/WebDemo';
import { WorkflowDemo } from '../home/cards/WorkflowDemo';

const DEMOS: Record<CapabilityId, React.FC> = {
  chat: ChatDemo,
  voice: VoiceDemo,
  web: WebDemo,
  apps: AppsDemo,
  crm: CrmDemo,
  workflow: WorkflowDemo,
  analytics: AnalyticsDemo,
  reputation: ReputationDemo,
};

const COUNT = FLAGSHIP_MOMENTS.length;
/** Scroll distance given to each moment while the scene is held, in viewport heights. */
const STEP_VH = 55;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * The eight capabilities as one day at a fictional business. On a desktop the
 * scene holds while the page scrolls and the day passes, dawn to night; on
 * smaller screens the hours are chosen directly. Each moment is a working
 * miniature, and only the one on screen is mounted.
 */
export const MainStreetDay: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLOListElement>(null);
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);

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
      setIndex(clamp(Math.floor((-rect.top / travel) * COUNT), 0, COUNT - 1));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [held]);

  // On small screens keep the chosen hour visible in the strip of hours.
  useEffect(() => {
    if (held) return;
    const rail = railRef.current;
    const item = rail?.children[index] as HTMLElement | undefined;
    if (rail && item) rail.scrollTo({ left: item.offsetLeft - rail.clientWidth / 2 + item.clientWidth / 2, behavior: 'smooth' });
  }, [index, held]);

  const go = (target: number) => {
    const next = clamp(target, 0, COUNT - 1);
    const section = sectionRef.current;
    if (!held || !section) {
      setIndex(next);
      return;
    }
    const top = section.getBoundingClientRect().top + window.scrollY;
    const travel = section.offsetHeight - window.innerHeight;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: top + ((next + 0.5) / COUNT) * travel, behavior: smooth ? 'smooth' : 'auto' });
  };

  const moment = FLAGSHIP_MOMENTS[index];
  const Demo = DEMOS[moment.id];
  const light = moment.ink === 'light';
  const ink = light ? 'text-sp-ivory' : 'text-sp-navy';
  const quiet = light ? 'text-sp-ivory/75' : 'text-sp-navy/70';
  const rule = light ? 'bg-sp-ivory/30' : 'bg-sp-navy/25';

  return (
    <section
      id="capabilities"
      ref={sectionRef}
      aria-labelledby="capabilities-heading"
      className="relative bg-sp-deep"
      style={held ? { height: `calc(100vh + ${COUNT * STEP_VH}vh)` } : undefined}
    >
      <div className={held ? 'sticky top-0 h-screen overflow-hidden' : 'relative overflow-hidden'}>
        {FLAGSHIP_MOMENTS.map((item, position) => (
          <div
            key={item.id}
            aria-hidden="true"
            className="absolute inset-0 transition-opacity duration-[1400ms] ease-out motion-reduce:transition-none"
            style={{
              background: `linear-gradient(to bottom, ${item.sky[0]} 0%, ${item.sky[1]} 58%, ${item.sky[2]} 100%)`,
              opacity: position === index ? 1 : 0,
            }}
          />
        ))}

        <div
          className={`sp-shell relative flex h-full flex-col pb-6 pt-[calc(var(--sp-space)*0.8)] transition-colors duration-700 lg:pb-7 lg:pt-28 ${ink}`}
        >
          <div className="grid gap-3 lg:grid-cols-12 lg:items-end lg:gap-12">
            <h2 id="capabilities-heading" className="font-editorial text-[clamp(1.75rem,1.3rem+1.4vw,2.5rem)] leading-[1.1] tracking-[-0.015em] lg:col-span-6">
              {FLAGSHIP_DAY.heading}
            </h2>
            <p className={`sp-body max-w-[34rem] transition-colors duration-700 lg:col-span-6 lg:justify-self-end ${quiet}`}>
              {FLAGSHIP_DAY.body}
            </p>
          </div>

          {/* The hours. On desktop this sits at the foot of the scene. */}
          <ol
            ref={railRef}
            aria-label="Moments in the day"
            className="relative -mx-[var(--sp-gutter)] mt-6 flex gap-1 overflow-x-auto px-[var(--sp-gutter)] pb-2 [scrollbar-width:none] lg:order-last lg:mx-0 lg:mr-60 lg:mt-5 lg:grid lg:grid-cols-8 lg:gap-0 lg:overflow-visible lg:px-0 lg:pb-0"
          >
            <li aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-[5px] hidden h-px transition-colors duration-700 lg:block ${rule}`} />
            {FLAGSHIP_MOMENTS.map((item, position) => {
              const current = position === index;
              return (
                <li key={item.id} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    aria-current={current ? 'step' : undefined}
                    onClick={() => go(position)}
                    className={`group relative flex w-full flex-col items-start gap-2 rounded-[3px] px-3 py-2 text-left transition-colors duration-500 lg:px-0 lg:py-0 ${
                      current ? ink : quiet
                    } ${current ? (light ? 'max-lg:bg-sp-ivory/15' : 'max-lg:bg-sp-navy/10') : ''}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`hidden h-[11px] w-[11px] rounded-full border transition-all duration-500 lg:block ${
                        light ? 'border-sp-ivory' : 'border-sp-navy'
                      } ${current ? (light ? 'scale-125 bg-sp-ivory' : 'scale-125 bg-sp-navy') : light ? 'bg-[#2a2f6a]' : 'bg-sp-ivory'}`}
                    />
                    <span className="whitespace-nowrap text-[15px] font-medium tabular-nums">
                      {item.time} {item.meridiem}
                    </span>
                    <span
                      className={`hidden whitespace-nowrap text-[14px] leading-tight transition-opacity duration-500 lg:block ${
                        current ? 'opacity-100' : 'opacity-0 group-hover:opacity-80 group-focus-visible:opacity-80'
                      }`}
                    >
                      {item.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 grid flex-1 items-center gap-8 lg:mt-0 lg:min-h-0 lg:grid-cols-12 lg:gap-12">
            <div key={moment.id} className="sp-fade lg:col-span-6">
              <p className="font-editorial leading-[0.85] tracking-[-0.03em]">
                <span className="text-[clamp(4.5rem,3rem+9vw,11.5rem)] tabular-nums">{moment.time}</span>
                <span className="ml-3 text-[clamp(1.25rem,1rem+1.2vw,2.25rem)] tracking-normal">{moment.meridiem}</span>
              </p>
              <h3 className="sp-h2 mt-5 lg:mt-7">{moment.title}</h3>
              <p className="sp-lede mt-4 max-w-[32rem]">{moment.story}</p>
              <div className="mt-6 flex gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => go(index - 1)}
                  disabled={index === 0}
                  className={`sp-btn min-h-[2.75rem] flex-1 border px-4 py-2 text-[15px] disabled:opacity-35 ${light ? 'border-sp-ivory/50' : 'border-sp-navy/40'}`}
                >
                  <Arrow className="rotate-180" />
                  {FLAGSHIP_DAY.previous}
                </button>
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  disabled={index === COUNT - 1}
                  className={`sp-btn min-h-[2.75rem] flex-1 border px-4 py-2 text-[15px] disabled:opacity-35 ${light ? 'border-sp-ivory/50' : 'border-sp-navy/40'}`}
                >
                  {FLAGSHIP_DAY.next}
                  <Arrow />
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 lg:flex lg:h-full lg:min-h-0 lg:items-center lg:justify-end">
              <div
                key={moment.id}
                className="sp-demo sp-fade mx-auto w-full max-w-[26rem] rounded-[10px] bg-sp-deep p-3 shadow-[0_40px_80px_-40px_rgba(5,10,32,0.7)] ring-1 ring-white/10 lg:mx-0 lg:w-[min(100%,calc((100svh-23rem)*0.786))] lg:max-w-[31rem]"
              >
                <Stage label={`${moment.title} demonstration`}>
                  <Demo />
                </Stage>
              </div>
            </div>
          </div>

          <p className={`mt-5 text-[14px] transition-colors duration-700 lg:order-last lg:mt-4 ${quiet}`}>{FLAGSHIP_DAY.note}</p>
        </div>
      </div>
    </section>
  );
};
