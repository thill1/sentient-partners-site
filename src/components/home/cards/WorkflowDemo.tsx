import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { HOME_DEMO } from '../../../content/homeContent';
import { Panel, miniButton } from './parts';

const { workflow } = HOME_DEMO;
const STEP_MS = 1100;

/** One inquiry moving through four automatic steps, started by the visitor. */
export const WorkflowDemo: React.FC = () => {
  const total = workflow.steps.length;
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (done >= total) {
      setRunning(false);
      return;
    }
    const timer = window.setTimeout(() => setDone((count) => count + 1), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [running, done, total]);

  const finished = done >= total;
  const start = () => {
    setDone(finished ? 1 : done + 1);
    setRunning(true);
  };

  return (
    <Panel tone="light" title="New inquiry workflow">
      <ol className="min-h-0 flex-1 px-3 pt-3">
        {workflow.steps.map((step, index) => {
          const complete = index < done;
          return (
            <li key={step.name} className="relative flex gap-3 pb-3.5 last:pb-0">
              {index < total - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[9px] top-5 h-[calc(100%-1.25rem)] w-px transition-colors duration-500 ${
                    index < done - 1 ? 'bg-sp-navy' : 'bg-sp-line'
                  }`}
                />
              )}
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border transition-colors duration-500 ${
                  complete ? 'border-sp-navy bg-sp-navy text-sp-ivory' : 'border-sp-navy/30 bg-white text-transparent'
                }`}
              >
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </span>
              <span className={`transition-opacity duration-500 ${complete ? 'opacity-100' : 'opacity-55'}`}>
                <span className="block font-medium text-sp-navy">{step.name}</span>
                <span className="mt-0.5 block text-sp-slate">{step.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-sp-line p-3">
        <p aria-live="polite" className="text-sp-slate">
          {finished ? 'All four steps ran.' : `${done} of ${total} steps`}
        </p>
        <button type="button" onClick={start} disabled={running} className={miniButton}>
          {finished ? 'Run again' : done === 0 ? 'Run the workflow' : 'Continue'}
        </button>
      </div>
    </Panel>
  );
};
