import React from 'react';
import { CA_FOUNDER } from '../../content/californiaContent';
import spMonogramNavy from '../../assets/sp-monogram-navy.png';
import { Reveal } from './primitives';

/** Introduce the person behind the work without an unfinished portrait panel. */
export const FounderSection: React.FC = () => (
  <section id="about" aria-labelledby="ca-founder-heading" className="bg-ca-ivory text-ca-navy">
    <div className="mx-auto grid max-w-[1400px] gap-10 ca-section px-5 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:px-12">
      <Reveal className="lg:col-span-5">
        <h2 id="ca-founder-heading" className="max-w-[15ch] ca-h2">{CA_FOUNDER.heading}</h2>
        <div className="mt-8 flex items-center gap-4">
          <img src={spMonogramNavy} alt="" className="h-14 w-14 object-contain" />
          <div>
            <p className="font-display text-[24px]">{CA_FOUNDER.name}</p>
            <p className="mt-1 text-[14px] text-ca-granite">{CA_FOUNDER.title}</p>
          </div>
        </div>
      </Reveal>
      <Reveal className="max-w-[34rem] space-y-5 ca-lede text-ca-navy/80 lg:col-span-6 lg:col-start-7 lg:self-center">
        {CA_FOUNDER.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </Reveal>
    </div>
  </section>
);
