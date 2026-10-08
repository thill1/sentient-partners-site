import React from 'react';
import type { CaImageKey } from '../../content/californiaContent';
import { Fog } from './Fog';
import { Photo, Reveal } from './primitives';

interface LandscapeInterludeProps {
  image: CaImageKey;
  line: string;
  lineSecond?: string;
  position?: string;
  caption?: string;
  id?: string;
}

/** A quiet, full-bleed pause: one photograph, one or two lines, nothing else. */
export const LandscapeInterlude: React.FC<LandscapeInterludeProps> = ({
  image,
  line,
  lineSecond,
  position = 'center',
  caption,
  id,
}) => (
  <section id={id} data-ca-tone="dark" className="relative isolate bg-ca-deep text-ca-ivory">
    <div className="relative flex h-[50svh] min-h-[360px] items-center sm:h-[60vh]">
      <Photo
        image={image}
        position={position}
        fill
        parallax={0.12}
        caption={caption}
        captionClassName="top-8 left-5 sm:top-10 sm:left-8 lg:left-12"
        className="-z-10"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-ca-deep/35" />
      <Fog className="-z-10 top-[25%] h-[70%]" opacity={0.32} duration={130} />
      <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <p className="max-w-[26ch] ca-statement">
            {line}
            {lineSecond && (
              <>
                <br />
                <span className="text-ca-ivory/60">{lineSecond}</span>
              </>
            )}
          </p>
        </Reveal>
      </div>
    </div>
  </section>
);
