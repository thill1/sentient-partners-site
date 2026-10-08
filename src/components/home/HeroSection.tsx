import React from 'react';
import { HOME_CTA, HOME_HERO } from '../../content/homeContent';
import { bookIntroduction, goToSection } from './actions';
import { Arrow } from './Arrow';

/**
 * The Golden Gate in fog, uncropped in spirit: the copy sits low and left so
 * the tower and the fog line stay clear.
 */
export const HeroSection: React.FC = () => (
  <section id="top" className="relative isolate flex min-h-[max(36rem,min(100svh,60rem))] items-end overflow-hidden bg-sp-deep">
    <div className="sp-settle absolute inset-0 -z-20">
      <img
        src="/home/golden-gate-fog-2048.webp"
        srcSet="/home/golden-gate-fog-1280.webp 1280w, /home/golden-gate-fog-2048.webp 2048w"
        sizes="(min-aspect-ratio: 16/7) 100vw, 230vh"
        alt={HOME_HERO.imageAlt}
        width={2048}
        height={896}
        decoding="async"
        className="h-full w-full origin-bottom-left object-cover object-[44%_50%] lg:scale-[1.12] lg:object-[0%_50%]"
      />
    </div>
    {/* Two quiet scrims: one keeps the header legible, one carries the copy. */}
    <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-sp-deep/70 to-transparent" />
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10 bg-gradient-to-t from-sp-deep/90 via-sp-deep/35 to-transparent lg:bg-gradient-to-tr lg:from-sp-deep/85 lg:via-sp-deep/25 lg:to-transparent"
    />

    <div className="sp-shell pb-[clamp(2.5rem,8vh,6rem)] pt-36">
      <h1 className="sp-display sp-arrive text-sp-ivory" style={{ '--sp-delay': '0.35s' } as React.CSSProperties}>
        {HOME_HERO.heading.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h1>
      <p
        className="sp-lede sp-arrive mt-6 max-w-[36rem] text-sp-ivory/95"
        style={{ '--sp-delay': '0.55s' } as React.CSSProperties}
      >
        {HOME_HERO.body}
      </p>
      <div
        className="sp-arrive mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
        style={{ '--sp-delay': '0.75s' } as React.CSSProperties}
      >
        <button type="button" onClick={() => bookIntroduction('Hero')} className="sp-btn sp-btn-champagne">
          {HOME_CTA.book}
          <Arrow />
        </button>
        <a
          href="#capabilities"
          onClick={(event) => goToSection(event, 'capabilities')}
          className="sp-btn sp-btn-outline-light"
        >
          {HOME_CTA.explore}
        </a>
      </div>
    </div>
  </section>
);
