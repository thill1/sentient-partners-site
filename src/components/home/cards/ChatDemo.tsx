import React, { useEffect, useRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { HOME_DEMO } from '../../../content/homeContent';
import { openSentientChat } from '../../../lib/siteActions';
import { Panel } from './parts';

const { chat, business } = HOME_DEMO;

/**
 * A sample conversation for a fictional business, chosen from three prompts.
 * The field at the bottom is real: it hands the question to the site's own
 * assistant.
 */
export const ChatDemo: React.FC = () => {
  const [picked, setPicked] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [question, setQuestion] = useState('');
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Keep the newest line of the sample conversation in view.
  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
  }, [picked, answered]);

  useEffect(() => {
    if (picked === null) return;
    setAnswered(false);
    const timer = window.setTimeout(() => setAnswered(true), 700);
    return () => window.clearTimeout(timer);
  }, [picked]);

  const askLive = (event: React.FormEvent) => {
    event.preventDefault();
    const text = question.trim();
    if (!text) return;
    openSentientChat({ source: 'Homepage · Chat card', ctaLabel: chat.liveSend, prefill: text });
    setQuestion('');
  };

  const bubble = 'max-w-[88%] rounded-[10px] px-3 py-2';

  return (
    <Panel tone="dark" title={`${business} assistant`}>
      <div ref={transcriptRef} aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        <p className={`${bubble} self-start rounded-tl-[3px] bg-white/10`}>{chat.greeting}</p>
        {picked === null ? (
          <ul className="mt-1 flex flex-col items-end gap-1.5">
            {chat.prompts.map((prompt, index) => (
              <li key={prompt.label}>
                <button
                  type="button"
                  onClick={() => setPicked(index)}
                  className="rounded-full border border-sp-champagne/60 px-3 py-1.5 text-sp-champagne transition-colors hover:bg-sp-champagne/10"
                >
                  {prompt.label}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p className={`${bubble} sp-fade self-end rounded-tr-[3px] bg-sp-champagne text-sp-deep`}>{chat.prompts[picked].label}</p>
            {answered ? (
              <p className={`${bubble} sp-fade self-start rounded-tl-[3px] bg-white/10`}>{chat.prompts[picked].reply}</p>
            ) : (
              <p className={`${bubble} self-start rounded-tl-[3px] bg-white/10 text-sp-ivory/70`}>
                <span className="sr-only">The assistant is replying</span>
                <span aria-hidden="true">…</span>
              </p>
            )}
            {answered && (
              <button
                type="button"
                onClick={() => setPicked(null)}
                className="self-end text-sp-champagne underline decoration-sp-champagne/40 underline-offset-4 hover:decoration-sp-champagne"
              >
                Ask something else
              </button>
            )}
          </>
        )}
      </div>

      <form onSubmit={askLive} className="shrink-0 border-t border-white/10 p-3">
        <label htmlFor="chat-card-live" className="mb-1.5 block text-[11.5px] text-sp-mist">
          {chat.liveLabel}
        </label>
        <div className="flex items-center gap-2">
          <input
            id="chat-card-live"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={chat.livePlaceholder}
            autoComplete="off"
            className="h-9 min-w-0 flex-1 rounded-[3px] border border-white/20 bg-transparent px-2.5 text-[13px] text-sp-ivory placeholder:text-sp-mist/70"
          />
          <button
            type="submit"
            aria-label={chat.liveSend}
            disabled={!question.trim()}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-sp-champagne text-sp-deep transition-opacity disabled:opacity-40"
          >
            <SendHorizontal aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </form>
    </Panel>
  );
};
