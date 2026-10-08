import React, { useState } from 'react';
import { CA_DIAGNOSIS } from '../../content/californiaContent';
import { Reveal, keepCompounds } from './primitives';
import { StallPath } from './StallPath';

/**
 * Diagnosis as an analyst's table, not a wall of alarms. Fog-toned, ruled,
 * one thesis in display type above it, and the thesis drawn: the path an
 * inquiry takes, with the gates where it stalls. Pointing at a row of the
 * table lights its gate, and the reverse.
 */
export const ResponseDiagnosis: React.FC = () => {
  const [active, setActive] = useState<number | null>(null);
  const gates = CA_DIAGNOSIS.rows.map((row) => row[0]);

  return (
    <section id="diagnose" aria-labelledby="ca-diagnose-heading" className="relative bg-ca-fog text-ca-navy">
      {/* Where the hero's horizon meets the page: the last of the sunset, as one fine line. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(to_bottom,rgba(226,120,84,0.10),rgba(226,120,84,0))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,rgba(233,176,96,0)_0%,rgba(233,176,96,0.9)_20%,rgba(226,107,79,0.95)_50%,rgba(140,90,154,0.85)_80%,rgba(140,90,154,0)_100%)]"
      />
      <div className="mx-auto max-w-[1400px] ca-section px-5 sm:px-8 lg:px-12">
        <Reveal className="max-w-[62rem]">
          <h2 id="ca-diagnose-heading" className="ca-h2">
            {CA_DIAGNOSIS.heading} <span className="text-ca-navy/60">{keepCompounds(CA_DIAGNOSIS.headingSecond)}</span>
          </h2>
          <p className="mt-8 max-w-[38rem] ca-lede text-ca-navy/70">{CA_DIAGNOSIS.body}</p>
        </Reveal>

        <Reveal className="mt-12 lg:mt-14">
          <StallPath
            start={CA_DIAGNOSIS.pathStart}
            end={CA_DIAGNOSIS.pathEnd}
            gates={gates}
            active={active}
            onActive={setActive}
          />
        </Reveal>

        <Reveal className="mt-6 lg:mt-8">
          {/* Desktop: a true table. Mobile: stacked rows that keep the same labels. */}
          <table className="hidden w-full border-collapse text-left md:table">
            <caption className="sr-only">Common points where demand stalls</caption>
            <thead>
              <tr className="border-b border-ca-navy">
                {CA_DIAGNOSIS.columns.map((col) => (
                  <th key={col} scope="col" className="pb-4 pr-8 text-[14px] font-normal text-ca-granite first:pl-4">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CA_DIAGNOSIS.rows.map(([symptom, looks, costs], i) => (
                <tr
                  key={symptom}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  className={`border-b border-ca-navy/12 align-top transition-colors duration-300 motion-reduce:transition-none ${
                    active === i ? 'bg-ca-navy/[0.045]' : ''
                  }`}
                >
                  <th
                    scope="row"
                    className={`w-[24%] py-6 pl-4 pr-8 font-display text-[21px] font-medium transition-colors duration-300 motion-reduce:transition-none ${
                      active === i ? 'text-ca-rust' : ''
                    }`}
                  >
                    {symptom}
                  </th>
                  <td className="w-[38%] py-6 pr-8 ca-body text-ca-navy/65">{looks}</td>
                  {/* The cost is the point of each row, so it reads strongest. */}
                  <td className="py-6 pr-4 ca-body font-medium text-ca-navy">{costs}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="border-t border-ca-navy md:hidden">
            {CA_DIAGNOSIS.rows.map(([symptom, looks, costs]) => (
              <div key={symptom} className="border-b border-ca-navy/12 py-6">
                <dt className="font-display text-[21px] font-medium">{symptom}</dt>
                <dd className="mt-2 ca-body text-ca-navy/65">{looks}</dd>
                <dd className="mt-2 ca-body font-medium text-ca-navy">
                  <span className="sr-only">{CA_DIAGNOSIS.columns[2]}: </span>
                  {costs}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
};
