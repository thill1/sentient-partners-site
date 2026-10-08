import React from 'react';
import { CA_EVIDENCE } from '../../content/californiaContent';
import { Reveal } from './primitives';

/**
 * The standard every case study will be held to, shown as the case file it
 * will fill: each field says what it must contain. Nothing is filled with
 * plausible-sounding numbers, and the file says plainly that none are
 * published yet.
 */
export const SelectedWork: React.FC = () => (
  <section id="testimonials" aria-labelledby="ca-evidence-heading" className="bg-ca-fog text-ca-navy">
    <div className="mx-auto max-w-[1400px] ca-section px-5 sm:px-8 lg:px-12">
      <Reveal className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2
            id="ca-evidence-heading"
            className="ca-h2"
          >
            {CA_EVIDENCE.heading}
          </h2>
        </div>
        <p className="max-w-[28rem] ca-lede text-ca-navy/70 lg:col-span-4 lg:col-start-9 lg:self-end">
          {CA_EVIDENCE.body}
        </p>
      </Reveal>

      {/* One specimen: the format every case study will follow, with what each field must hold. */}
      <Reveal className="mt-16 lg:mt-20">
        <article
          aria-label="Case file format"
          className="border border-ca-navy/15 bg-[#FBFAF7] shadow-[0_40px_80px_-60px_rgba(13,31,78,0.35)]"
        >
          <div className="flex flex-col gap-3 border-b border-ca-navy/12 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
            <p className="font-display text-[24px]">Case file</p>
            <p className="inline-flex w-fit items-center border border-ca-rust/50 px-2.5 py-1 text-[12px] font-medium text-ca-rust">
              {CA_EVIDENCE.status}
            </p>
          </div>
          <dl className="grid sm:grid-cols-2 lg:grid-cols-3">
            {CA_EVIDENCE.fields.map((field, f) => (
              <div
                key={field}
                className={`grid grid-cols-[8.5rem_1fr] gap-3 border-b border-l-ca-navy/10 border-b-ca-navy/10 px-6 py-4 sm:block sm:px-10 sm:py-6 ${f % 2 === 1 ? 'sm:border-l' : 'sm:border-l-0'} ${
                  f % 3 !== 0 ? 'lg:border-l' : 'lg:border-l-0'
                }`}
              >
                <dt className="text-[13px] text-ca-granite">{field}</dt>
                <dd className="font-display text-[17px] leading-snug text-ca-navy/85 sm:mt-2 sm:text-[20px]">{CA_EVIDENCE.standards[f]}</dd>
              </div>
            ))}
          </dl>
          <p className="px-6 py-5 text-[14px] text-ca-navy/70 sm:px-10">{CA_EVIDENCE.note}</p>
        </article>
      </Reveal>
    </div>
  </section>
);
