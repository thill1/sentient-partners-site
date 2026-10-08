import React from 'react';
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

/**
 * Eight contained miniatures in one consistent frame: a navy mat holding the
 * tool, then a title and one outcome. Each card keeps its own state.
 */
export const CapabilitiesSection: React.FC = () => (
  <section id="capabilities" aria-labelledby="capabilities-heading" className="sp-section bg-sp-ivory">
    <div className="sp-shell">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-12">
        <h2 id="capabilities-heading" className="sp-h2 text-sp-navy lg:col-span-6">
          {HOME_CAPABILITIES.heading}
        </h2>
        <p className="sp-lede text-sp-ink lg:col-span-5 lg:col-start-8">{HOME_CAPABILITIES.body}</p>
      </div>

      <ul className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {HOME_CAPABILITY_CARDS.map((card) => {
          const Demo = DEMOS[card.id];
          return (
            <li
              key={card.id}
              className="flex flex-col overflow-hidden rounded-[6px] bg-sp-cream shadow-[0_22px_44px_-32px_rgba(13,31,78,0.45)] ring-1 ring-sp-navy/[0.08]"
            >
              <div className="sp-demo bg-sp-deep p-3">
                <div
                  role="group"
                  aria-label={`${card.title} demonstration`}
                  className="h-[19.5rem] overflow-hidden rounded-[4px] font-ui text-[12.5px] leading-snug"
                >
                  <Demo />
                </div>
              </div>
              <div className="px-5 pb-6 pt-5">
                <h3 className="sp-h3 text-sp-navy">{card.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-sp-slate">{card.outcome}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 max-w-[44rem] text-[14px] leading-relaxed text-sp-slate">{HOME_CAPABILITIES.note}</p>
    </div>
  </section>
);
