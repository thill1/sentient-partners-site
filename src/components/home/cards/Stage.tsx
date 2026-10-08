import React, { useLayoutEffect, useRef, useState } from 'react';

/** Every miniature is drawn at this size, then scaled to the width its card has. */
const STAGE = { width: 264, height: 336 };

/**
 * Holds one miniature and scales it like a picture, so the eight stay
 * identical in proportion at every breakpoint and grow with the card.
 */
export const Stage: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => setScale(frame.clientWidth / STAGE.width);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className="relative overflow-hidden rounded-[5px]"
      style={{ aspectRatio: `${STAGE.width} / ${STAGE.height}` }}
    >
      <div
        role="group"
        aria-label={label}
        className="absolute left-0 top-0 origin-top-left font-ui text-[12.5px] leading-snug"
        style={{ width: STAGE.width, height: STAGE.height, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
};
