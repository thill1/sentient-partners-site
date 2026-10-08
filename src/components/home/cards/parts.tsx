import React, { useId } from 'react';

/** Shared surfaces for the capability cards, so all eight read as one set. */

interface PanelProps {
  tone: 'light' | 'dark';
  /** The name shown in the panel's title strip. */
  title: string;
  /** Optional content at the right of the title strip. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ tone, title, aside, children }) => (
  <div className={`flex h-full flex-col ${tone === 'dark' ? 'bg-[#11244F] text-sp-ivory' : 'bg-white text-sp-ink'}`}>
    <div
      className={`flex h-9 shrink-0 items-center justify-between gap-3 border-b px-3 ${
        tone === 'dark' ? 'border-white/10' : 'border-sp-line'
      }`}
    >
      <span className={`truncate text-[12px] font-medium ${tone === 'dark' ? 'text-sp-ivory' : 'text-sp-navy'}`}>{title}</span>
      {aside}
    </div>
    <div className="flex min-h-0 flex-1 flex-col">{children}</div>
  </div>
);

interface MiniTabsProps<T extends string> {
  label: string;
  tabs: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  children: React.ReactNode;
}

/** A small tab set with arrow-key movement. The panel below is labelled by the active tab. */
export function MiniTabs<T extends string>({ label, tabs, value, onChange, children }: MiniTabsProps<T>) {
  const base = useId();
  const move = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length];
    onChange(next.id);
    document.getElementById(`${base}-${next.id}`)?.focus();
  };

  return (
    <>
      <div
        role="tablist"
        aria-label={label}
        className={`flex shrink-0 border-b border-sp-line px-3 ${tabs.length > 3 ? 'justify-between gap-2' : 'gap-4'}`}
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === value;
          return (
            <button
              key={tab.id}
              id={`${base}-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${base}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => move(event, index)}
              className={`-mb-px whitespace-nowrap border-b-2 py-2 text-[11.5px] transition-colors ${
                selected ? 'border-sp-navy font-medium text-sp-navy' : 'border-transparent text-sp-slate hover:text-sp-navy'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-${value}`} className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </>
  );
}

/** A quiet state word at the end of a row. */
export const Tag: React.FC<{ children: React.ReactNode; strong?: boolean }> = ({ children, strong = false }) => (
  <span
    className={`shrink-0 rounded-[3px] px-1.5 py-0.5 text-[11px] ${
      strong ? 'bg-sp-navy text-sp-ivory' : 'bg-sp-ivory text-sp-slate'
    }`}
  >
    {children}
  </span>
);

/** The small action button used inside the light panels. */
export const miniButton =
  'inline-flex min-h-[2rem] items-center justify-center gap-1.5 rounded-[3px] bg-sp-navy px-3 text-[12px] font-medium text-sp-ivory transition-colors hover:bg-sp-deep disabled:opacity-40';

export const miniButtonQuiet =
  'inline-flex min-h-[2rem] items-center justify-center gap-1.5 rounded-[3px] border border-sp-navy/25 px-3 text-[12px] font-medium text-sp-navy transition-colors hover:border-sp-navy/60';
