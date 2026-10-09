import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, Globe, LayoutGrid, MessageSquare, Phone, Star, Users, Workflow, type LucideIcon } from 'lucide-react';
import { EPIC_SIGNS, EPIC_STREET, EPIC_STREET_ORDER } from '../../content/epicContent';
import { HOME_CAPABILITY_CARDS, type CapabilityId } from '../../content/homeContent';
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
import { followTarget } from './scrollEasing';
import { openSentientChat } from '../../lib/siteActions';

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

/** What a passer-by sees in a dark window: the trade of the shop. */
const GLYPHS: Record<CapabilityId, LucideIcon> = {
  web: Globe,
  chat: MessageSquare,
  voice: Phone,
  apps: LayoutGrid,
  crm: Users,
  workflow: Workflow,
  analytics: BarChart3,
  reputation: Star,
};

type Roof = 'cornice' | 'stepped' | 'arched' | 'gable' | 'flat' | 'cupola';

/** Eight buildings in the manner of a Gold Country main street. */
const BUILDINGS: Record<CapabilityId, { wall: string; roof: Roof; awning: boolean; windows: number }> = {
  web: { wall: '#4A2A36', roof: 'cornice', awning: true, windows: 3 },
  chat: { wall: '#1C2860', roof: 'stepped', awning: false, windows: 2 },
  voice: { wall: '#3E2634', roof: 'arched', awning: false, windows: 3 },
  apps: { wall: '#C2BFCF', roof: 'gable', awning: false, windows: 2 },
  crm: { wall: '#52303A', roof: 'cornice', awning: true, windows: 3 },
  workflow: { wall: '#212D69', roof: 'flat', awning: true, windows: 2 },
  analytics: { wall: '#33325F', roof: 'stepped', awning: false, windows: 3 },
  reputation: { wall: '#55323F', roof: 'cupola', awning: false, windows: 3 },
};

const WARM = '#F6C98A';
const COUNT = EPIC_STREET_ORDER.length;
/** Scroll distance from one shop to the next while the street is held, in viewport heights. */
const STEP_VH = 78;
/** Matches the previous 0.09/frame response at 60 Hz without changing feel across displays. */
const STREET_FOLLOW_MS = 175;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** The upper floor and roofline of a building. */
const UpperFloor: React.FC<{ id: CapabilityId; lit: boolean }> = ({ id, lit }) => {
  const { wall, roof, windows } = BUILDINGS[id];
  const pale = wall === '#C2BFCF';
  const trim = pale ? '#77748C' : '#C9A96F';
  const slots = Array.from({ length: windows }, (_, index) => 54 + ((346 - 54 - 44) / (windows - 1 || 1)) * index);

  return (
    <svg viewBox="0 0 400 128" className="block h-auto w-full overflow-visible" aria-hidden="true">
      {roof === 'gable' && <path d="M0 58 L200 -6 L400 58 Z" fill={wall} />}
      {roof === 'stepped' && <path d="M0 36 H112 V10 H288 V36 H400 V40 H0 Z" fill={wall} />}
      {roof === 'cupola' && (
        <g fill={wall}>
          <rect x={166} y={-22} width={68} height={62} />
          <path d="M156 -22 Q200 -84 244 -22 Z" />
          <rect x={198} y={-92} width={4} height={22} />
          <rect x={184} y={-8} width={12} height={26} fill={lit ? WARM : '#0B1230'} opacity={lit ? 0.9 : 1} />
          <rect x={204} y={-8} width={12} height={26} fill={lit ? WARM : '#0B1230'} opacity={lit ? 0.9 : 1} />
        </g>
      )}
      <rect x={0} y={roof === 'gable' ? 58 : 36} width={400} height={roof === 'gable' ? 70 : 92} fill={wall} />
      {roof !== 'gable' && roof !== 'stepped' && (
        <rect x={-6} y={28} width={412} height={roof === 'flat' ? 9 : 14} fill={wall} stroke={trim} strokeOpacity={0.55} strokeWidth={1} />
      )}
      {roof === 'stepped' && <path d="M112 10 H288" stroke={trim} strokeOpacity={0.55} strokeWidth={1.5} />}

      {slots.map((x, index) => {
        const glowing = lit || (index + id.length) % 3 === 0;
        const y = roof === 'gable' ? 70 : 54;
        const height = roof === 'gable' ? 46 : 60;
        const shared = { fill: glowing ? WARM : '#0B1230', opacity: glowing ? (lit ? 0.92 : 0.38) : 1 };
        return roof === 'arched' ? (
          <path key={x} d={`M${x} ${y + height} V${y + 18} Q${x + 22} ${y - 14} ${x + 44} ${y + 18} V${y + height} Z`} {...shared} />
        ) : (
          <g key={x}>
            <rect x={x} y={y} width={44} height={height} {...shared} />
            <path d={`M${x + 22} ${y} V${y + height} M${x} ${y + height / 2} H${x + 44}`} stroke={wall} strokeWidth={2} />
            <rect x={x - 3} y={y + height} width={50} height={3} fill={trim} opacity={0.5} />
          </g>
        );
      })}
    </svg>
  );
};

const Awning: React.FC<{ pale: boolean }> = ({ pale }) => (
  <svg viewBox="0 0 400 30" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-x-[-2%] top-0 z-10 h-[7%] w-[104%]">
    <path d="M12 0 H388 L400 30 H0 Z" fill="#0B1230" />
    {Array.from({ length: 12 }, (_, stripe) => (
      <path
        key={stripe}
        d={`M${12 + stripe * 31.3 + 8} 0 h15.6 l${(stripe - 5.5) * 0.9} 30 h-16.6 Z`}
        fill={pale ? '#77748C' : '#C9A96F'}
        opacity={0.6}
      />
    ))}
  </svg>
);

/**
 * The eight capabilities as a walk down a main street at dusk. On a desktop
 * the street holds and slides past as the page scrolls; on a phone you swipe
 * along it. The shop in front of you is lit, and its window is the working
 * miniature. Only that one is mounted, so a call in progress stops when you
 * walk on.
 */
export const MainStreet: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const ridgeRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px) and (min-height: 640px)');
    const apply = () => setHeld(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  // Held: the page's scroll walks the street, with a little weight in the step.
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!held || !section || !track) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let position = -1;
    let frame = 0;
    let previousTime = performance.now();
    const walk = (now: number) => {
      frame = requestAnimationFrame(walk);
      const elapsed = now - previousTime;
      previousTime = now;
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const travel = rect.height - window.innerHeight;
      const wanted = clamp(-rect.top / Math.max(1, travel), 0, 1) * (COUNT - 1);
      position = position < 0 || still ? wanted : followTarget(position, wanted, elapsed, STREET_FOLLOW_MS);
      track.style.transform = `translate3d(calc(50vw - var(--bw) * ${(position + 0.5).toFixed(4)}), 0, 0)`;
      if (ridgeRef.current) ridgeRef.current.style.transform = `translate3d(${(-position * 3).toFixed(3)}vw, 0, 0)`;
      setIndex((current) => {
        const next = Math.round(position);
        return next === current ? current : next;
      });
    };
    frame = requestAnimationFrame(walk);
    return () => {
      cancelAnimationFrame(frame);
      track.style.transform = '';
    };
  }, [held]);

  // Not held: the street scrolls sideways on its own, and the nearest shop opens.
  const onSwipe = () => {
    const track = trackRef.current;
    if (held || !track) return;
    const shop = track.children[0] as HTMLElement | undefined;
    if (!shop) return;
    setIndex(clamp(Math.round(track.scrollLeft / shop.offsetWidth), 0, COUNT - 1));
  };

  const go = (target: number) => {
    const next = clamp(target, 0, COUNT - 1);
    const section = sectionRef.current;
    const track = trackRef.current;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (held && section) {
      const top = section.getBoundingClientRect().top + window.scrollY;
      const travel = section.offsetHeight - window.innerHeight;
      window.scrollTo({ top: top + (next / (COUNT - 1)) * travel, behavior: smooth ? 'smooth' : 'auto' });
    } else if (track) {
      const shop = track.children[0] as HTMLElement | undefined;
      track.scrollTo({ left: next * (shop?.offsetWidth ?? 0), behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  const openId = EPIC_STREET_ORDER[index];
  const card = HOME_CAPABILITY_CARDS.find((item) => item.id === openId) ?? HOME_CAPABILITY_CARDS[0];
  const stepper =
    'inline-flex h-11 w-11 items-center justify-center rounded-full border border-sp-ivory/40 text-sp-ivory transition-colors hover:border-sp-ivory disabled:opacity-30';

  return (
    <section
      id="capabilities"
      ref={sectionRef}
      aria-labelledby="capabilities-heading"
      className="relative bg-[#060A1C] text-sp-ivory [--bw:86vw] lg:[--bw:min(36vw,calc((100svh-470px)/1.22),34rem)]"
      // Preserve the shared scroll margin so the fixed header never covers the section heading.
      style={held ? { height: `calc(100vh + ${(COUNT - 1) * STEP_VH}vh)` } : undefined}
    >
      <div
        className={`flex flex-col overflow-hidden bg-[linear-gradient(to_bottom,#060A1C_0%,#0B1132_30%,#2A2259_62%,#70487A_84%,#C4705A_100%)] ${
          held ? 'sticky top-0 h-screen' : 'relative'
        }`}
      >
        <div className="sp-shell shrink-0 pb-6 pt-[calc(var(--sp-space)*0.9)] lg:pb-4 lg:pt-[104px]">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-12">
            <div className="lg:col-span-8">
              <h2 id="capabilities-heading" className="text-[13px] uppercase tracking-[0.24em] text-sp-champagne">
                {EPIC_STREET.heading}
              </h2>
              <p className="mt-2 text-[11.5px] leading-relaxed text-sp-mist">
                <span className="font-medium text-sp-champagne">Illustrative demo</span>
                <span aria-hidden="true"> · </span>
                <span>All businesses and data shown are fictional.</span>
              </p>
              <div key={card.id} className="sp-fade mt-3" aria-live="polite">
                <h3 className="font-editorial text-[clamp(2.25rem,1.3rem+3.4vw,4.25rem)] leading-[1] tracking-[-0.022em]">{card.title}</h3>
                <p className="sp-lede mt-3 max-w-[40rem] text-sp-mist lg:min-h-[3.1em]">{card.outcome}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 lg:col-span-4 lg:justify-end">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label={EPIC_STREET.previous} className={stepper}>
                  <Arrow className="rotate-180" />
                </button>
                <span className="min-w-[3.25rem] text-center text-[15px] tabular-nums tracking-[0.1em]" aria-hidden="true">
                  {index + 1} / {COUNT}
                </span>
                <button type="button" onClick={() => go(index + 1)} disabled={index === COUNT - 1} aria-label={EPIC_STREET.next} className={stepper}>
                  <Arrow />
                </button>
              </div>
              <button
                type="button"
                onClick={() => openSentientChat({ source: 'Capabilities section', ctaLabel: 'Ask the Concierge' })}
                aria-label="Ask the Concierge"
                className="inline-flex h-11 min-w-11 items-center justify-center gap-2 border border-sp-ivory/35 px-3 text-sm text-sp-ivory transition-colors hover:border-sp-champagne hover:text-sp-champagne focus:outline-none focus-visible:ring-2 focus-visible:ring-sp-champagne"
              >
                <MessageSquare aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="hidden whitespace-nowrap min-[1024px]:inline">Ask the Concierge</span>
              </button>
            </div>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col justify-end">
          {/* The far ridge, which moves more slowly than the street. */}
          <div ref={ridgeRef} aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[-10vw] w-[150vw] will-change-transform">
            <svg viewBox="0 0 1500 300" preserveAspectRatio="none" className="absolute bottom-[4vh] h-[46%] w-full">
              <path d="M0 210 C120 150 220 190 340 140 C460 92 560 170 700 120 C830 76 930 150 1060 108 C1200 66 1320 150 1500 96 V300 H0 Z" fill="#1A1744" opacity={0.75} />
              <path d="M0 250 C160 200 300 240 450 196 C620 150 760 232 930 190 C1100 150 1270 226 1500 176 V300 H0 Z" fill="#120F33" />
            </svg>
          </div>

          <ul
            ref={trackRef}
            onScroll={onSwipe}
            aria-label="Storefronts"
            className={`relative flex items-end will-change-transform ${
              held ? '' : 'snap-x snap-mandatory overflow-x-auto px-[7vw] [scrollbar-width:none]'
            }`}
          >
            {EPIC_STREET_ORDER.map((id, position) => {
              const lit = position === index;
              const { wall, awning } = BUILDINGS[id];
              const pale = wall === '#C2BFCF';
              const title = HOME_CAPABILITY_CARDS.find((item) => item.id === id)?.title ?? id;
              const Demo = DEMOS[id];
              const Glyph = GLYPHS[id];
              return (
                <li key={id} className="relative w-[var(--bw)] shrink-0 snap-center px-[0.6%]">
                  {/* String lights from lamp to lamp. */}
                  <svg viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[2.5%] z-20 h-[6%] w-full">
                    <path d="M0 4 Q200 60 400 4" fill="none" stroke="#C9A96F" strokeOpacity={0.5} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                    {Array.from({ length: 9 }, (_, bulb) => {
                      const t = (bulb + 0.5) / 9;
                      return <ellipse key={bulb} cx={t * 400} cy={4 + 56 * 2 * t * (1 - t) * 0.98} rx={3.4} ry={4.2} fill="#FFE2AE" />;
                    })}
                  </svg>

                  <div
                    className={`transition-[filter] duration-700 ease-out motion-reduce:transition-none ${
                      lit ? '' : 'brightness-[0.72] saturate-[0.9]'
                    }`}
                  >
                    <UpperFloor id={id} lit={lit} />
                    <div style={{ backgroundColor: wall }}>
                      <p
                        className={`mx-[5%] border py-[2.2%] text-center font-editorial text-[clamp(0.95rem,calc(var(--bw)*0.046),1.45rem)] uppercase leading-none tracking-[0.3em] transition-colors duration-700 ${
                          lit ? 'border-[#F6C98A] bg-[#080E26] text-[#FCE9C8]' : 'border-[#C9A96F]/50 bg-[#080E26] text-[#C9B38A]'
                        }`}
                        aria-hidden="true"
                      >
                        {EPIC_SIGNS[id]}
                      </p>
                      <div className={`relative flex items-end gap-[3%] px-[5%] ${awning ? 'pt-[9.5%]' : 'pt-[4.5%]'}`}>
                        {awning && <Awning pale={pale} />}
                        <div
                          className={`sp-demo relative z-20 min-w-0 flex-1 rounded-t-[5px] bg-[#070C20] p-[6px] ring-1 transition-shadow duration-700 ${
                            lit ? 'shadow-[0_0_70px_4px_rgba(246,201,138,0.55)] ring-[#F6C98A]' : 'ring-[#C9A96F]/40'
                          }`}
                        >
                          {lit ? (
                            <div className="sp-fade">
                              <Stage label={`${title} demonstration`}>
                                <Demo />
                              </Stage>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => go(position)}
                              aria-label={title}
                              className="flex w-full items-center justify-center rounded-[4px] bg-[linear-gradient(160deg,rgba(246,201,138,0.62),rgba(246,201,138,0.30)_55%,rgba(246,201,138,0.5))]"
                              style={{ aspectRatio: '264 / 336' }}
                            >
                              <Glyph aria-hidden="true" className="h-[22%] w-[22%] text-[#080E26] opacity-60" strokeWidth={1} />
                            </button>
                          )}
                        </div>
                        <div
                          aria-hidden="true"
                          className="relative h-[calc(var(--bw)*0.86)] w-[15%] shrink-0 rounded-t-[3px] ring-1 ring-[#C9A96F]/40 transition-colors duration-700"
                          style={{ backgroundColor: lit ? '#F3C583' : 'rgba(246,201,138,0.42)' }}
                        >
                          <span className="absolute inset-x-0 top-[22%] h-[2px] bg-[#070C20]/70" />
                          <span className="absolute left-[18%] top-[55%] h-[9%] w-[3px] rounded-full bg-[#070C20]/70" />
                        </div>
                      </div>
                    </div>
                    <div className="h-[10px] bg-[#1A2247]" />
                  </div>

                  {/* The light a lit window throws onto the pavement. */}
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-x-[4%] bottom-[-22px] z-0 h-5 rounded-[50%] bg-[#F6C98A] blur-[12px] transition-opacity duration-700 ${
                      lit ? 'opacity-60' : 'opacity-0'
                    }`}
                  />
                  {/* A street lamp between buildings. */}
                  <svg viewBox="0 0 30 300" aria-hidden="true" className="pointer-events-none absolute bottom-0 right-[-15px] z-20 h-[62%] w-[30px] overflow-visible">
                    <circle cx={15} cy={16} r={15} fill="#FFE2AE" opacity={0.22} filter="blur(4px)" />
                    <rect x={13.5} y={24} width={3} height={276} fill="#070C20" />
                    <path d="M8 26 H22 L19 8 H11 Z" fill="#FFE2AE" />
                    <rect x={6} y={4} width={18} height={4} fill="#070C20" />
                    <rect x={9} y={292} width={12} height={8} fill="#070C20" />
                  </svg>
                </li>
              );
            })}
          </ul>

        </div>
      </div>
    </section>
  );
};
