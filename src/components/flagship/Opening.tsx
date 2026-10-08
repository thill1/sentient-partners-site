import React from 'react';
import { HOME_CTA, HOME_HERO } from '../../content/homeContent';
import { bookIntroduction, goToSection } from '../home/actions';
import { Arrow } from '../home/Arrow';
import { FogCanvas } from './FogCanvas';

const delay = (seconds: number) => ({ '--sp-delay': `${seconds}s` }) as React.CSSProperties;

/**
 * The opening. "Global Experience." is set far off, in the fog at the
 * horizon; "Local Impact." stands on the hill in the foreground. The fog
 * starts dense and clears to show the bridge.
 */
export const Opening: React.FC = () => (
  <section id="top" className="relative isolate flex min-h-[max(40rem,100svh)] flex-col overflow-hidden bg-sp-deep">
    <div className="absolute inset-0 -z-30">
      <img
        src="/home/golden-gate-fog-2048.webp"
        srcSet="/home/golden-gate-fog-1280.webp 1280w, /home/golden-gate-fog-2048.webp 2048w"
        sizes="(min-aspect-ratio: 16/7) 100vw, 230vh"
        alt={HOME_HERO.imageAlt}
        width={2048}
        height={896}
        decoding="async"
        className="h-full w-full origin-bottom-left object-cover object-[45%_50%] lg:scale-[1.12] lg:object-[0%_50%]"
      />
    </div>
    <FogCanvas className="-z-20" />
    <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-sp-deep/65 to-transparent" />
    <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-[62%] bg-gradient-to-t from-sp-deep/90 via-sp-deep/45 to-transparent" />

    <div className="sp-shell flex flex-1 flex-col pb-[clamp(2.25rem,7vh,5rem)] pt-[clamp(7.5rem,19vh,13rem)]">
      <h1 className="sp-display flex flex-1 flex-col text-sp-ivory">
        <span className="sp-emerge block [text-shadow:0_2px_30px_rgba(8,20,51,0.35)]" style={delay(0.5)}>
          {HOME_HERO.heading[0]}
        </span>
        <span className="sp-arrive mt-auto block pt-10" style={delay(2.2)}>
          {HOME_HERO.heading[1]}
        </span>
      </h1>
      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <p className="sp-lede sp-arrive max-w-[34rem] text-sp-ivory/95" style={delay(2.6)}>
          {HOME_HERO.body}
        </p>
        <div className="sp-arrive flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4" style={delay(2.9)}>
          <button type="button" onClick={() => bookIntroduction('Opening')} className="sp-btn sp-btn-champagne">
            {HOME_CTA.book}
            <Arrow />
          </button>
          <a href="#capabilities" onClick={(event) => goToSection(event, 'capabilities')} className="sp-btn sp-btn-outline-light">
            {HOME_CTA.explore}
          </a>
        </div>
      </div>
    </div>
  </section>
);
