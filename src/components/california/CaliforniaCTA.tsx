import React from 'react';
import { CA_CLOSE, CA_CTA, CA_SCENES } from '../../content/californiaContent';
import { openBookingModal } from '../../lib/siteActions';
import { Fog } from './Fog';
import { Arrow, CaButton, Photo, Reveal } from './primitives';

/** The decision: back to the landscape, calm and unhurried. */
export const CaliforniaCTA: React.FC = () => (
  <section id="get-started" data-ca-tone="dark" aria-labelledby="ca-close-heading" className="relative isolate bg-ca-deep text-ca-ivory">
    <div className="relative flex min-h-[640px] items-end sm:min-h-[70vh]">
      <Photo
        image="dawn"
        position="50% 45%"
        fill
        parallax={0.1}
        caption={CA_SCENES.dawn}
        captionClassName="top-[96px] left-5 sm:left-8 lg:left-12"
        className="-z-10"
      />
      <Fog className="-z-10 top-[38%] h-[55%]" opacity={0.3} duration={150} />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(6,12,28,0.6)_0%,rgba(6,12,28,0)_24%)]" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(6,12,28,0.9)_0%,rgba(6,12,28,0.45)_50%,rgba(6,12,28,0.2)_100%)]"
      />
      <div className="mx-auto w-full max-w-[1400px] px-5 pb-16 pt-32 sm:px-8 sm:pb-24 lg:px-12">
        <Reveal>
          <h2
            id="ca-close-heading"
            className="max-w-[17ch] ca-statement"
          >
            {CA_CLOSE.heading}
          </h2>
          <p className="mt-8 max-w-[32rem] ca-lede text-ca-ivory/75 sm:text-[18px]">{CA_CLOSE.body}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <CaButton
              tone="onDark"
              onClick={() => openBookingModal({ source: 'California · Close', ctaLabel: CA_CTA.primary })}
            >
              {CA_CTA.primary} <Arrow />
            </CaButton>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);
