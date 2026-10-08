import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { HOME_DEMO } from '../../../content/homeContent';
import { MiniTabs, Panel } from './parts';

const { web, business, trade } = HOME_DEMO;
const TABS = [
  { id: 'site', label: 'Website' },
  { id: 'search', label: 'Search listing' },
] as const;
type TabId = (typeof TABS)[number]['id'];

/** A fictional home-service site, and how it would appear in a local search. */
export const WebDemo: React.FC = () => {
  const [tab, setTab] = useState<TabId>('site');

  return (
    <Panel tone="light" title={web.search.url}>
      <MiniTabs label="Website views" tabs={TABS} value={tab} onChange={setTab}>
        {tab === 'site' ? (
          <div className="sp-fade flex h-full flex-col">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="font-editorial text-[14px] leading-tight text-sp-navy">
                {business} <span className="font-ui text-[11px] text-sp-slate">{trade}</span>
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-center bg-[#1F3A34] px-4 py-3 text-sp-ivory">
              <p className="font-editorial text-[22px] leading-[1.1]">{web.heading}</p>
              <p className="mt-1.5 text-[12px] text-sp-ivory/85">{web.body}</p>
              <span className="mt-3 inline-flex h-7 w-fit items-center rounded-[3px] bg-sp-champagne px-3 text-[11.5px] font-medium text-sp-deep">
                {web.action}
              </span>
            </div>
            <ul className="grid grid-cols-3 divide-x divide-sp-line border-t border-sp-line text-center text-[11px] leading-tight text-sp-slate">
              {web.points.map((point) => (
                <li key={point} className="px-1.5 py-2.5">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="sp-fade p-3">
            <p className="flex h-8 items-center gap-2 rounded-full border border-sp-line px-3 text-sp-slate">
              <Search aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{web.search.query}</span>
            </p>
            <div className="mt-4">
              <p className="text-[11px] text-sp-slate">{web.search.url}</p>
              <p className="mt-0.5 text-[14px] font-medium leading-snug text-sp-navy">{web.search.title}</p>
              <p className="mt-1 text-sp-slate">{web.search.description}</p>
            </div>
            <dl className="mt-4 space-y-1.5 border-t border-sp-line pt-3 text-sp-slate">
              <div className="flex justify-between gap-3">
                <dt>Service area</dt>
                <dd className="text-sp-ink">Auburn, Newcastle, Loomis</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Next step</dt>
                <dd className="text-sp-ink">{web.action}</dd>
              </div>
            </dl>
          </div>
        )}
      </MiniTabs>
    </Panel>
  );
};
