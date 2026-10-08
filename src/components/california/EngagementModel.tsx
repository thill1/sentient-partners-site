import React from 'react';
import { CA_ENGAGEMENT, CA_REFINE } from '../../content/californiaContent';
import { FAQS } from '../../content/siteContent';
import { InvestmentBlock } from './Investment';
import { Reveal } from './primitives';
import { useReached } from './useReached';

/**
 * The process as an engagement model: stage, what happens, and what you
 * receive. The stages hang on the same line as the system section's cable, and
 * light as the reader reaches them.
 */
export const EngagementModel: React.FC = () => {
  const stages = CA_ENGAGEMENT.stages;
  const { ref, reached, reachedTop, lastTop } = useReached<HTMLOListElement>(stages.length);

  return (
    <section id="process" data-ca-tone="dark" aria-labelledby="ca-process-heading" className="bg-ca-navy text-ca-ivory">
      <div className="mx-auto max-w-[1400px] ca-section px-5 sm:px-8 lg:px-12">
        <Reveal>
          <h2
            id="ca-process-heading"
            className="max-w-[20ch] ca-h2"
          >
            {CA_ENGAGEMENT.heading}
          </h2>
        </Reveal>

        <ol ref={ref} className="relative mt-10 border-t border-ca-ivory/30 lg:mt-14">
          {/* One line down the stages: faint for the whole way, bright as far as the reader has come. */}
          <span aria-hidden="true" className="absolute left-[4px] top-[42px] hidden w-px bg-ca-ivory/15 md:block" style={{ height: lastTop }} />
          <span
            aria-hidden="true"
            className="absolute left-[4px] top-[42px] hidden w-px bg-ca-ivory/70 transition-[height] duration-[900ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none md:block"
            style={{ height: reached >= 0 ? reachedTop : 0 }}
          />
          {stages.map((stage, i) => (
            <Reveal
              as="li"
              key={stage.name}
              delay={i * 100}
              className="grid gap-3 border-b border-ca-ivory/10 py-6 md:grid-cols-12 md:gap-8 md:py-7"
            >
              <div className="relative md:col-span-1">
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-[10px] hidden h-[9px] w-[9px] border transition-colors duration-500 md:block ${
                    i <= reached ? 'border-ca-orange bg-ca-orange' : 'border-ca-ivory/40 bg-ca-navy'
                  }`}
                />
                <p
                  className={`font-display text-[20px] leading-[28px] lining-nums tabular-nums transition-colors duration-500 md:pl-6 ${
                    i <= reached ? 'text-ca-champagne' : 'text-ca-champagne/75'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </p>
              </div>
              <h3 className="font-display text-[26px] leading-tight md:col-span-4 lg:col-span-3">{stage.name}</h3>
              <p className="max-w-[36rem] ca-body text-ca-ivory/70 md:col-span-7 lg:col-span-5">
                {stage.detail}
              </p>
              <p className="text-[13px] text-ca-ivory/55 md:col-span-11 md:col-start-2 lg:col-span-3 lg:col-start-auto lg:text-right">
                <span className="text-ca-ivory/55">You receive: </span>
                <span className="text-ca-ivory">{stage.receive}</span>
              </p>
            </Reveal>
          ))}
        </ol>

        <details id="refine" className="group mt-8 border-b border-ca-ivory/20 pb-5">
          <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-6 rounded-sm font-display text-[24px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-ivory [&::-webkit-details-marker]:hidden">
            {CA_REFINE.heading}
            <span aria-hidden="true" className="text-[24px] transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="mt-4 max-w-[42rem] ca-body text-ca-ivory/80">{CA_REFINE.body}</p>
          <ul className="mt-4 space-y-2 ca-body text-ca-ivory/80">
            {CA_REFINE.points.map((point) => <li key={point}>{point}</li>)}
          </ul>
        </details>
        <InvestmentBlock />
        <div id="faq" className="mt-12 border-t border-ca-ivory/20 pt-10 lg:mt-16">
          <h3 className="font-display text-[28px] leading-tight">A few practical questions</h3>
          <div className="mt-6">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group border-b border-ca-ivory/15 py-3">
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-5 rounded-sm text-[16px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-ivory [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span aria-hidden="true" className="text-[22px] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-[42rem] pb-3 ca-body text-ca-ivory/85">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
