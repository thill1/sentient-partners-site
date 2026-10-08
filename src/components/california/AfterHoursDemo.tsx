import React from 'react';
import { CA_DEMO, CA_SCENES } from '../../content/californiaContent';
import { CallConsole } from './CallConsole';
import { Fog } from './Fog';
import { SCENARIOS } from '../demo/scenarios';
import { Photo, Reveal } from './primitives';
import { GOLDEN_GATE_NIGHT_SCENE } from './hero/ambientScenes';

/**
 * The page crosses from California into the technology layer here: night
 * falls on the bridge, and the working front desk takes over.
 * The call console runs the production demo's logic (useFrontDeskDemo): same
 * scenarios, server voice, ledger, and handoffs, in the concept's design.
 */
export const AfterHoursDemo: React.FC = () => (
  <section id="demo" data-ca-tone="dark" aria-labelledby="ca-demo-heading" className="bg-ca-deep text-ca-ivory">
    <div className="relative isolate flex h-[44svh] min-h-[360px] items-end sm:h-[48vh]">
      <Photo
        image="night"
        position="58% 50%"
        decorative
        fill
        parallax={0.1}
        scene={GOLDEN_GATE_NIGHT_SCENE}
        caption={CA_SCENES.night}
        captionClassName="top-[96px] left-5 sm:left-8 lg:left-12"
        className="-z-10"
      />
      <Fog className="-z-10 top-[48%] h-[36%]" opacity={0.16} duration={160} />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(6,12,28,0.25)_0%,rgba(6,12,28,0.35)_45%,#060C1C_100%)]"
      />
      <div className="mx-auto w-full max-w-[1400px] px-5 pb-6 sm:px-8 lg:px-12">
        <Reveal>
          <h2
            id="ca-demo-heading"
            className="max-w-[18ch] ca-statement"
          >
            {CA_DEMO.heading}
          </h2>
        </Reveal>
      </div>
    </div>

    <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-10 sm:px-8 md:pb-20 lg:px-12">
      <div className="grid gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <p className="max-w-[26rem] ca-lede text-ca-ivory/80">{CA_DEMO.body}</p>
          <p className="mt-5 max-w-[28rem] text-[13px] leading-relaxed text-ca-ivory/75">{CA_DEMO.footnote}</p>
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-ca-ivory/10 pt-6 font-mono text-[11px] uppercase tracking-[0.14em]">
            <div>
              <dt className="text-ca-ivory/55">Line</dt>
              <dd className="mt-1.5 text-ca-ivory/80">{CA_DEMO.statusLabel}</dd>
            </div>
            <div>
              <dt className="text-ca-ivory/55">Voice</dt>
              <dd className="mt-1.5 text-ca-ivory/80">Generated live</dd>
            </div>
            <div>
              <dt className="text-ca-ivory/55">Handoff</dt>
              <dd className="mt-1.5 text-ca-ivory/80">Live AI agent</dd>
            </div>
            <div>
              <dt className="text-ca-ivory/55">Scenarios</dt>
              <dd className="mt-1.5 text-ca-ivory/80">{SCENARIOS.length} industries</dd>
            </div>
          </dl>
        </Reveal>

        <Reveal delay={120} className="lg:col-span-8">
          <CallConsole />
        </Reveal>
      </div>

    </div>
  </section>
);
