import React from 'react';
import { Check, Loader2, Circle, CalendarCheck } from 'lucide-react';
import type { Scenario } from './scenarios';

interface ValueLedgerProps {
  scenario: Scenario;
  doneIds: string[];
  activeId: string | null;
  showOutcome: boolean;
  revenueShown: number;
}

export const ValueLedger: React.FC<ValueLedgerProps> = ({
  scenario,
  doneIds,
  activeId,
  showOutcome,
  revenueShown,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-brand-900/10 bg-white/80 p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <p className="mb-4 text-[10px] uppercase tracking-brand text-brand-900/50 dark:text-white/50">
          Value ledger
        </p>
        <ul className="space-y-3">
          {scenario.ledger.map((event) => {
            const done = doneIds.includes(event.id);
            const running = activeId === event.id;
            return (
              <li key={event.id} className="flex items-center gap-3 text-sm">
                {done ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : running ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-500 dark:text-brand-300" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-brand-900/20 dark:text-white/20" />
                )}
                <span
                  className={
                    done
                      ? 'text-brand-900 dark:text-white'
                      : running
                      ? 'text-brand-700 dark:text-brand-200'
                      : 'text-brand-900/40 dark:text-white/40'
                  }
                >
                  {event.label}
                </span>
                <span className="ml-auto text-xs tabular-nums text-brand-900/40 dark:text-white/40">
                  {done ? event.clock : ''}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div
        className={`rounded-2xl bg-brand-900 p-5 text-white transition-all duration-700 dark:bg-white dark:text-brand-900 ${
          showOutcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
        aria-hidden={!showOutcome}
      >
        <p className="text-xs text-white/60 dark:text-brand-900/60">Est. revenue recovered</p>
        <p className="mt-1 font-display text-4xl font-semibold tabular-nums">
          ${revenueShown.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-white/60 dark:text-brand-900/60">{scenario.revenueNote}</p>
      </div>

      <div
        className={`flex items-center gap-3 rounded-2xl border border-brand-900/10 bg-white/80 p-4 transition-all duration-700 dark:border-white/10 dark:bg-white/[0.04] ${
          showOutcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
        aria-hidden={!showOutcome}
      >
        <CalendarCheck className="h-6 w-6 shrink-0 text-brand-700 dark:text-brand-300" />
        <div>
          <p className="text-sm font-medium text-brand-900 dark:text-white">
            {scenario.bookedSlot.when}
          </p>
          <p className="text-xs text-brand-900/50 dark:text-white/50">
            {scenario.bookedSlot.detail}
          </p>
        </div>
      </div>
    </div>
  );
};
