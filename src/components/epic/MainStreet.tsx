import React, { useState } from 'react';
import { EPIC_SIGNS, EPIC_STREET, EPIC_STREET_ORDER } from '../../content/epicContent';
import { HOME_CAPABILITY_CARDS, type CapabilityId } from '../../content/homeContent';
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

type Roof = 'cornice' | 'stepped' | 'arched' | 'gable' | 'flat' | 'cupola';

/** Eight buildings in the manner of a Gold Country main street. */
const BUILDINGS: Record<CapabilityId, { height: number; wall: string; roof: Roof; awning: boolean; windows: number }> = {
  web: { height: 232, wall: '#3B2230', roof: 'cornice', awning: true, windows: 3 },
  chat: { height: 204, wall: '#172150', roof: 'stepped', awning: false, windows: 2 },
  voice: { height: 262, wall: '#33202E', roof: 'arched', awning: false, windows: 2 },
  apps: { height: 246, wall: '#B9B6C6', roof: 'gable', awning: false, windows: 2 },
  crm: { height: 216, wall: '#402530', roof: 'cornice', awning: true, windows: 3 },
  workflow: { height: 196, wall: '#1B2658', roof: 'flat', awning: true, windows: 2 },
  analytics: { height: 250, wall: '#2A2A52', roof: 'stepped', awning: false, windows: 3 },
  reputation: { height: 236, wall: '#43283A', roof: 'cupola', awning: false, windows: 3 },
};

const GROUND = 330;
const WARM = '#F6C98A';

const Storefront: React.FC<{ id: CapabilityId; lit: boolean }> = ({ id, lit }) => {
  const { height, wall, roof, awning, windows } = BUILDINGS[id];
  const top = GROUND - height;
  const pale = wall === '#B9B6C6';
  const trim = pale ? '#6F6C82' : '#C9A96F';
  const slots = Array.from({ length: windows }, (_, index) => 24 + ((152 - 24) / (windows - 1 || 1)) * index);

  return (
    <svg viewBox="0 0 200 340" className="block h-auto w-full overflow-visible" aria-hidden="true">
      {lit && <ellipse cx={100} cy={GROUND + 4} rx={96} ry={9} fill={WARM} opacity={0.28} className="sp-fade" />}

      {roof === 'gable' && <path d={`M4 ${top + 30} L100 ${top - 22} L196 ${top + 30} Z`} fill={wall} />}
      {roof === 'stepped' && <path d={`M4 ${top} H60 V${top - 14} H140 V${top} H196 V${top + 4} H4 Z`} fill={wall} />}
      {roof === 'cupola' && (
        <g fill={wall}>
          <rect x={78} y={top - 34} width={44} height={36} />
          <path d={`M72 ${top - 34} Q100 ${top - 74} 128 ${top - 34} Z`} />
          <rect x={98.5} y={top - 78} width={3} height={14} />
        </g>
      )}
      <rect x={4} y={roof === 'gable' ? top + 30 : top} width={192} height={roof === 'gable' ? height - 30 : height} fill={wall} />
      {(roof === 'cornice' || roof === 'flat' || roof === 'arched' || roof === 'cupola') && (
        <rect x={0} y={top - 5} width={200} height={roof === 'flat' ? 6 : 10} fill={wall} stroke={trim} strokeOpacity={0.5} strokeWidth={0.8} />
      )}
      <rect x={4} y={GROUND - 152} width={192} height={1} fill={trim} opacity={0.35} />

      {/* Upper floor */}
      {slots.map((x, index) => {
        const glowing = lit || (index + id.length) % 3 === 0;
        const y = (roof === 'gable' ? top + 46 : top + 24) + (roof === 'arched' ? 8 : 0);
        return roof === 'arched' ? (
          <path
            key={x}
            d={`M${x} ${y + 46} V${y + 12} Q${x + 12} ${y - 8} ${x + 24} ${y + 12} V${y + 46} Z`}
            fill={glowing ? WARM : '#0B1230'}
            opacity={glowing ? (lit ? 0.9 : 0.4) : 1}
          />
        ) : (
          <rect key={x} x={x} y={y} width={24} height={38} fill={glowing ? WARM : '#0B1230'} opacity={glowing ? (lit ? 0.9 : 0.4) : 1} />
        );
      })}

      {/* Sign */}
      <rect x={14} y={GROUND - 146} width={172} height={26} fill="#080E26" stroke={lit ? WARM : trim} strokeOpacity={lit ? 0.9 : 0.45} strokeWidth={1} />
      <text
        x={100}
        y={GROUND - 128}
        textAnchor="middle"
        fontSize={13.5}
        letterSpacing={2.4}
        className="font-editorial uppercase transition-[fill] duration-500"
        fill={lit ? '#FCE9C8' : '#C9B38A'}
      >
        {EPIC_SIGNS[id]}
      </text>

      {/* Shop window and door */}
      {lit && <rect x={10} y={GROUND - 124} width={180} height={120} fill={WARM} opacity={0.35} filter="blur(10px)" className="sp-fade" />}
      <rect x={18} y={GROUND - 110} width={112} height={86} fill={WARM} opacity={lit ? 1 : 0.2} className="transition-opacity duration-700" />
      <rect x={142} y={GROUND - 110} width={40} height={110} fill={WARM} opacity={lit ? 0.85 : 0.14} className="transition-opacity duration-700" />
      <g stroke="#080E26" strokeWidth={2} opacity={0.85}>
        <line x1={74} y1={GROUND - 110} x2={74} y2={GROUND - 24} />
        <line x1={18} y1={GROUND - 84} x2={130} y2={GROUND - 84} />
        <line x1={142} y1={GROUND - 70} x2={182} y2={GROUND - 70} />
      </g>
      {awning && (
        <g>
          <path d={`M10 ${GROUND - 116} H190 L198 ${GROUND - 98} H2 Z`} fill="#0B1230" />
          {Array.from({ length: 10 }, (_, stripe) => (
            <path
              key={stripe}
              d={`M${10 + stripe * 18} ${GROUND - 116} h9 l${0.4 + stripe * 0.02}  18 h-${9.6} Z`}
              fill={trim}
              opacity={0.55}
              transform={`translate(${(stripe - 4.5) * 0.9} 0)`}
            />
          ))}
        </g>
      )}
      <rect x={0} y={GROUND} width={200} height={4} fill="#1A2247" />
    </svg>
  );
};

/** A string of lights along the street, hung in four swags. */
const StringLights: React.FC = () => (
  <svg viewBox="0 0 1600 60" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[8%] hidden h-10 w-full lg:block">
    {Array.from({ length: 4 }, (_, swag) => (
      <path key={swag} d={`M${swag * 400} 8 Q${swag * 400 + 200} 64 ${swag * 400 + 400} 8`} fill="none" stroke="#C9A96F" strokeOpacity={0.45} strokeWidth={1} vectorEffect="non-scaling-stroke" />
    ))}
    {Array.from({ length: 44 }, (_, bulb) => {
      const t = ((bulb + 0.5) / 44) * 4;
      const local = t % 1;
      return <circle key={bulb} cx={t * 400} cy={8 + 56 * 2 * local * (1 - local)} r={3.2} fill="#FFE2AE" opacity={0.9} />;
    })}
  </svg>
);

/**
 * The eight capabilities as eight storefronts. Choosing a window lights the
 * shop and opens its working miniature above the street. Only the open one is
 * mounted, so a call in progress stops when you walk on.
 */
export const MainStreet: React.FC = () => {
  const [open, setOpen] = useState<CapabilityId>('voice');
  const card = HOME_CAPABILITY_CARDS.find((item) => item.id === open) ?? HOME_CAPABILITY_CARDS[0];
  const Demo = DEMOS[open];

  return (
    <section
      id="capabilities"
      aria-labelledby="capabilities-heading"
      className="relative flex flex-col overflow-hidden bg-[linear-gradient(to_bottom,#060A1C_0%,#0A1030_38%,#241F52_70%,#5B3F6E_88%,#A8604F_100%)] text-sp-ivory"
    >
      <div className="sp-shell pt-[var(--sp-space)]">
        <div className="grid gap-4 lg:grid-cols-12 lg:items-end lg:gap-12">
          <h2 id="capabilities-heading" className="sp-h2 lg:col-span-7">
            {EPIC_STREET.heading}
          </h2>
          <p className="sp-lede text-sp-mist lg:col-span-5">{EPIC_STREET.body}</p>
        </div>
      </div>

      <div className="sp-shell order-3 pb-[var(--sp-space)] pt-8 lg:order-2 lg:pb-0">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
          <div key={card.id} className="sp-fade lg:col-span-6" aria-live="polite">
            <h3 className="font-editorial text-[clamp(2.25rem,1.4rem+3.2vw,4.5rem)] leading-[1.02] tracking-[-0.022em]">{card.title}</h3>
            <p className="sp-lede mt-5 max-w-[30rem] text-sp-mist">{card.outcome}</p>
          </div>
          <div className="lg:col-span-6 lg:flex lg:justify-end">
            <div
              key={card.id}
              className="sp-demo sp-fade mx-auto w-full max-w-[25rem] rounded-[10px] bg-sp-deep p-3 shadow-[0_0_90px_-10px_rgba(246,201,138,0.35)] ring-1 ring-[#F6C98A]/35 lg:mx-0 lg:max-w-[min(24rem,calc((100svh-26rem)*0.786))]"
            >
              <Stage label={`${card.title} demonstration`}>
                <Demo />
              </Stage>
            </div>
          </div>
        </div>
      </div>

      <div className="relative order-2 mt-8 lg:order-3 lg:mt-4">
        <StringLights />
        <ul
          aria-label="Storefronts"
          className="flex snap-x snap-mandatory items-end gap-0 overflow-x-auto px-[var(--sp-gutter)] [scrollbar-width:none] lg:grid lg:grid-cols-8 lg:overflow-visible lg:px-[clamp(0.5rem,2vw,2.5rem)]"
        >
          {EPIC_STREET_ORDER.map((id) => {
            const lit = id === open;
            const title = HOME_CAPABILITY_CARDS.find((item) => item.id === id)?.title ?? id;
            return (
              <li key={id} className="w-[44vw] max-w-[13rem] shrink-0 snap-center lg:w-auto lg:max-w-none">
                <button
                  type="button"
                  aria-pressed={lit}
                  aria-label={title}
                  onClick={() => setOpen(id)}
                  className={`block w-full origin-bottom transition-[transform,filter] duration-500 ease-out hover:brightness-125 focus-visible:brightness-125 motion-reduce:transition-none ${
                    lit ? 'lg:scale-[1.04]' : ''
                  }`}
                >
                  <Storefront id={id} lit={lit} />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="bg-[#0B1027] px-[var(--sp-gutter)] py-3 text-center text-[13.5px] text-sp-mist/80 lg:py-4">{EPIC_STREET.note}</p>
      </div>
    </section>
  );
};
