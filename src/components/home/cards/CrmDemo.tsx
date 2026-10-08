import React, { useState } from 'react';
import { HOME_DEMO } from '../../../content/homeContent';
import { Arrow } from '../Arrow';
import { Panel, miniButtonQuiet } from './parts';

const { crm, business } = HOME_DEMO;

/** A three-stage pipeline. Moving a customer forward updates the counts. */
export const CrmDemo: React.FC = () => {
  const [stages, setStages] = useState<Record<string, number>>(() =>
    Object.fromEntries(crm.leads.map((lead) => [lead.id, lead.stage])),
  );
  const [view, setView] = useState(0);
  const lastStage = crm.stages.length - 1;
  const inView = crm.leads.filter((lead) => stages[lead.id] === view);
  const moved = crm.leads.some((lead) => stages[lead.id] !== lead.stage);

  return (
    <Panel
      tone="light"
      title={`${business} pipeline`}
      aside={
        moved ? (
          <button
            type="button"
            onClick={() => setStages(Object.fromEntries(crm.leads.map((lead) => [lead.id, lead.stage])))}
            className="text-[11.5px] text-sp-slate underline underline-offset-2 hover:text-sp-navy"
          >
            Reset
          </button>
        ) : undefined
      }
    >
      <div role="group" aria-label="Pipeline stages" className="grid shrink-0 grid-cols-3 gap-1.5 p-3 pb-2">
        {crm.stages.map((stage, index) => {
          const count = crm.leads.filter((lead) => stages[lead.id] === index).length;
          const selected = index === view;
          return (
            <button
              key={stage}
              type="button"
              aria-pressed={selected}
              onClick={() => setView(index)}
              className={`rounded-[3px] border px-2 py-2 text-left transition-colors ${
                selected ? 'border-sp-navy bg-sp-navy text-sp-ivory' : 'border-sp-line text-sp-slate hover:border-sp-navy/40'
              }`}
            >
              <span className="block font-editorial text-[20px] leading-none">{count}</span>
              <span className="mt-1 block text-[11.5px]">{stage}</span>
            </button>
          );
        })}
      </div>

      <ul aria-live="polite" className="min-h-0 flex-1 divide-y divide-sp-line overflow-y-auto border-t border-sp-line">
        {inView.length === 0 && <li className="px-3 py-4 text-sp-slate">No customers in {crm.stages[view]}.</li>}
        {inView.map((lead) => (
          <li key={lead.id} className="sp-fade flex items-center justify-between gap-2 px-3 py-2.5">
            <span className="min-w-0">
              <span className="block truncate font-medium text-sp-navy">{lead.name}</span>
              <span className="mt-0.5 block truncate text-sp-slate">{lead.need}</span>
            </span>
            {view < lastStage && (
              <button
                type="button"
                onClick={() => setStages((current) => ({ ...current, [lead.id]: view + 1 }))}
                aria-label={`Move ${lead.name} to ${crm.stages[view + 1]}`}
                className={`${miniButtonQuiet} shrink-0 px-2`}
              >
                {crm.stages[view + 1]}
                <Arrow className="h-3 w-3" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
};
