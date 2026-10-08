import React, { useState } from 'react';
import { HOME_DEMO } from '../../../content/homeContent';
import { MiniTabs, Panel, Tag } from './parts';

const { apps, business } = HOME_DEMO;
type TabId = (typeof apps.tabs)[number]['id'];

/** One workspace for a fictional business: customers, estimates, invoices, and the schedule. */
export const AppsDemo: React.FC = () => {
  const [tab, setTab] = useState<TabId>('customers');
  const active = apps.tabs.find((item) => item.id === tab) ?? apps.tabs[0];

  return (
    <Panel tone="light" title={`${business} workspace`}>
      <MiniTabs label="Workspace sections" tabs={apps.tabs} value={tab} onChange={setTab}>
        <ul key={active.id} className="sp-fade divide-y divide-sp-line">
          {active.rows.map((row) => (
            <li key={row.primary} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate font-medium text-sp-navy">{row.primary}</span>
                <span className="mt-0.5 block truncate text-sp-slate">{row.secondary}</span>
              </span>
              <Tag>{row.status}</Tag>
            </li>
          ))}
        </ul>
      </MiniTabs>
    </Panel>
  );
};
