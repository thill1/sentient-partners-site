import React from 'react';
import { CA_REFINE, CA_SCENES } from '../../content/californiaContent';
import { Photo, Reveal } from './primitives';

/** The one warm reset: ordered rows, late light, and what happens after launch. */
export const Refinement: React.FC = () => (
  <section id="refine" aria-labelledby="ca-refine-heading" className="bg-ca-ivory text-ca-navy">
    <div className="grid lg:min-h-[88vh] lg:grid-cols-2">
      <Photo
        image="firstLight"
        position="45% 55%"
        sizes="(min-width: 1024px) 50vw, 100vw"
        parallax={0.06}
        caption={CA_SCENES.firstLight}
        className="aspect-[4/3] lg:aspect-auto"
      />
      <div className="flex items-center px-5 py-20 sm:px-8 md:py-28 lg:px-16 xl:px-24">
        <Reveal className="max-w-[34rem]">
          <h2
            id="ca-refine-heading"
            className="ca-h2"
          >
            {CA_REFINE.heading}
          </h2>
          <p className="mt-7 ca-lede text-ca-navy/70">{CA_REFINE.body}</p>
          <ul className="mt-10 border-t border-ca-navy/20">
            {CA_REFINE.points.map((point) => (
              <li key={point} className="border-b border-ca-navy/12 py-4 text-[15px]">
                {point}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </div>
  </section>
);
