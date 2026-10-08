import React, { useState } from 'react';
import { HOME_DEMO } from '../../../content/homeContent';
import { Panel } from './parts';

const { analytics } = HOME_DEMO;
type CampaignId = (typeof analytics.campaigns)[number]['id'];
const PEAK = Math.max(...analytics.campaigns.flatMap((campaign) => campaign.weeks));

/** Three sample campaigns. Choosing one shows its leads, calls, cost per lead, and weekly trend. */
export const AnalyticsDemo: React.FC = () => {
  const [selected, setSelected] = useState<CampaignId>('search');
  const campaign = analytics.campaigns.find((item) => item.id === selected) ?? analytics.campaigns[0];

  return (
    <Panel tone="light" title="Campaigns" aside={<span className="text-[11.5px] text-sp-slate">{analytics.label}</span>}>
      <div role="group" aria-label="Campaign" className="shrink-0 divide-y divide-sp-line border-b border-sp-line">
        {analytics.campaigns.map((item) => {
          const checked = item.id === selected;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={checked}
              onClick={() => setSelected(item.id)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                checked ? 'bg-sp-ivory font-medium text-sp-navy' : 'text-sp-slate hover:text-sp-navy'
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full border ${checked ? 'border-sp-navy bg-sp-navy' : 'border-sp-navy/40'}`}
              />
              {item.name}
            </button>
          );
        })}
      </div>

      <div aria-live="polite" className="flex min-h-0 flex-1 flex-col p-3">
        <dl className="grid shrink-0 grid-cols-3 gap-2">
          {[
            { label: 'Leads', value: String(campaign.leads) },
            { label: 'Calls', value: String(campaign.calls) },
            { label: 'Cost per lead', value: `$${campaign.costPerLead}` },
          ].map((metric) => (
            <div key={metric.label}>
              <dt className="text-[11.5px] text-sp-slate">{metric.label}</dt>
              <dd className="mt-0.5 font-editorial text-[22px] leading-none text-sp-navy">{metric.value}</dd>
            </div>
          ))}
        </dl>

        <figure className="mt-3 flex min-h-0 flex-1 flex-col">
          <div
            role="img"
            aria-label={`Leads per week for ${campaign.name}: ${campaign.weeks.join(', ')}`}
            className="flex min-h-0 flex-1 items-end gap-2 border-b border-sp-navy/30"
          >
            {campaign.weeks.map((value, index) => (
              <span
                key={index}
                className="flex-1 rounded-t-[2px] bg-sp-navy transition-[height] duration-500 ease-out motion-reduce:transition-none"
                style={{ height: `${Math.round((value / PEAK) * 100)}%` }}
              />
            ))}
          </div>
          <figcaption className="mt-1.5 shrink-0 text-[11.5px] text-sp-slate">Leads per week, last five weeks</figcaption>
        </figure>
      </div>
    </Panel>
  );
};
