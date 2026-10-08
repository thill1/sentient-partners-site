import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { HOME_DEMO } from '../../../content/homeContent';
import { MiniTabs, Panel, miniButton, miniButtonQuiet } from './parts';

const { reputation } = HOME_DEMO;
const TABS = [
  { id: 'reply', label: 'Reply to a review' },
  { id: 'request', label: 'Ask for one' },
] as const;
type TabId = (typeof TABS)[number]['id'];

/**
 * A sample review with an editable draft reply, and a sample review request.
 * Approving or sending changes only this card. Nothing leaves the page.
 */
export const ReputationDemo: React.FC = () => {
  const [tab, setTab] = useState<TabId>('reply');
  const [draft, setDraft] = useState<string>(reputation.draft);
  const [approved, setApproved] = useState(false);
  const [requested, setRequested] = useState(false);

  return (
    <Panel tone="light" title="Reviews">
      <MiniTabs label="Review tasks" tabs={TABS} value={tab} onChange={setTab}>
        {tab === 'reply' ? (
          <div className="sp-fade flex h-full flex-col p-3">
            <p className="flex items-center gap-2">
              <span role="img" aria-label={`${reputation.stars} out of 5 stars`} className="flex gap-0.5 text-sp-bronze">
                {Array.from({ length: reputation.stars }, (_, index) => (
                  <Star key={index} aria-hidden="true" className="h-3 w-3 fill-current" strokeWidth={0} />
                ))}
              </span>
              <span className="text-sp-slate">{reputation.reviewer}</span>
            </p>
            <p className="mt-1.5 text-sp-ink">{reputation.review}</p>

            {approved ? (
              <div aria-live="polite" className="mt-3 flex flex-1 flex-col">
                <p className="flex-1 rounded-[3px] bg-sp-ivory p-2.5 text-sp-ink">{draft}</p>
                <p className="mt-2 text-sp-slate">Approved in this demo. Nothing was published.</p>
                <button type="button" onClick={() => setApproved(false)} className={`${miniButtonQuiet} mt-2 self-start`}>
                  Edit the reply
                </button>
              </div>
            ) : (
              <div className="mt-3 flex flex-1 flex-col">
                <label htmlFor="reputation-draft" className="text-[11.5px] text-sp-slate">
                  Draft reply
                </label>
                <textarea
                  id="reputation-draft"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="mt-1 min-h-0 flex-1 resize-none rounded-[3px] border border-sp-navy/25 p-2 text-[12.5px] leading-snug text-sp-ink"
                />
                <button
                  type="button"
                  onClick={() => setApproved(true)}
                  disabled={!draft.trim()}
                  className={`${miniButton} mt-2 self-start`}
                >
                  Approve reply
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="sp-fade flex h-full flex-col p-3">
            <p className="text-[11.5px] text-sp-slate">Text message, sent after a completed visit</p>
            <p className="mt-2 max-w-[92%] rounded-[10px] rounded-tl-[3px] bg-sp-ivory px-3 py-2 text-sp-ink">{reputation.request}</p>
            <div aria-live="polite" className="mt-auto">
              {requested ? (
                <>
                  <p className="text-sp-slate">Marked as sent in this demo. No message was sent.</p>
                  <button type="button" onClick={() => setRequested(false)} className={`${miniButtonQuiet} mt-2`}>
                    Reset
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setRequested(true)} className={miniButton}>
                  Send sample request
                </button>
              )}
            </div>
          </div>
        )}
      </MiniTabs>
    </Panel>
  );
};
