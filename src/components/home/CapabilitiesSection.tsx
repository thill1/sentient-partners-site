import React, { useLayoutEffect, useRef, useState } from 'react';
import { HOME_CAPABILITIES, HOME_CAPABILITY_CARDS, type CapabilityId } from '../../content/homeContent';
import { AnalyticsDemo } from './cards/AnalyticsDemo';
import { AppsDemo } from './cards/AppsDemo';
import { ChatDemo } from './cards/ChatDemo';
import { CrmDemo } from './cards/CrmDemo';
import { ReputationDemo } from './cards/ReputationDemo';
import { VoiceDemo } from './cards/VoiceDemo';
import { WebDemo } from './cards/WebDemo';
import { WorkflowDemo } from './cards/WorkflowDemo';

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

/** Every miniature is drawn at this size, then scaled to the width its card has. */
const STAGE = { width: 264, height: 336 };

/**
 * Holds one miniature and scales it like a picture, so the eight stay
 * identical in proportion at every breakpoint and grow with the card.
 */
const Stage: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => setScale(frame.clientWidth / STAGE.width);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className="relative overflow-hidden rounded-[5px]"
      style={{ aspectRatio: `${STAGE.width} / ${STAGE.height}` }}
    >
      <div
        role="group"
        aria-label={label}
        className="absolute left-0 top-0 origin-top-left font-ui text-[12.5px] leading-snug"
        style={{ width: STAGE.width, height: STAGE.height, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * Eight contained miniatures in one consistent frame: a navy mat holding the
 * tool, then a title and one outcome. Each card keeps its own state.
 */
export const CapabilitiesSection: React.FC = () => (
  <section id="capabilities" aria-labelledby="capabilities-heading" className="bg-sp-ivory pb-[var(--sp-space)] pt-[calc(var(--sp-space)*0.85)]">
    <div className="sp-shell grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-12">
      <h2 id="capabilities-heading" className="sp-h2 text-sp-navy lg:col-span-7">
        {HOME_CAPABILITIES.heading}
      </h2>
      <p className="sp-lede text-sp-ink lg:col-span-5">{HOME_CAPABILITIES.body}</p>
    </div>

    <div className="sp-shell-wide mt-10 lg:mt-14">
      <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
        {HOME_CAPABILITY_CARDS.map((card) => {
          const Demo = DEMOS[card.id];
          return (
            <li
              key={card.id}
              className="flex flex-col overflow-hidden rounded-[8px] bg-sp-cream shadow-[0_28px_56px_-36px_rgba(13,31,78,0.55)] ring-1 ring-sp-navy/[0.08]"
            >
              <div className="sp-demo bg-sp-deep p-2.5 sm:p-3">
                <Stage label={`${card.title} demonstration`}>
                  <Demo />
                </Stage>
              </div>
              <div className="px-5 pb-7 pt-5 sm:px-6">
                <h3 className="font-editorial text-[1.5rem] leading-[1.15] tracking-[-0.012em] text-sp-navy">{card.title}</h3>
                <p className="mt-2.5 text-[1.0625rem] leading-[1.55] text-sp-slate">{card.outcome}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>

    <p className="sp-shell mt-8 text-[15px] leading-relaxed text-sp-slate">{HOME_CAPABILITIES.note}</p>
  </section>
);
