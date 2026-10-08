import React, { useEffect, useRef } from 'react';
import { Fog } from '../Fog';
import { createCityScene, type CityScene } from './cityScene';
import { SF_DUSK_SCENE } from './sfDuskScene';
import type { StageProps } from './stage';

const IMG = '/concept/california/sf-dusk';
const IMG_ASPECT = 2400 / 1350;
/** Seconds for one full camera sweep out and back. */
const PAN_PERIOD = 84;

/**
 * The photographic hero: San Francisco at dusk with a live 2D layer of
 * traffic, aircraft, and inquiries, panned like a drone shot. Used when the
 * 3D city can't run (no WebGL 2, or the GPU drops the context).
 */
export const PhotoStage: React.FC<StageProps> = ({ reduced, copyRef, onReady, onFrame }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const trailsRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const cb = useRef({ onReady, onFrame });
  cb.current = { onReady, onFrame };

  useEffect(() => {
    const stage = stageRef.current;
    const camera = cameraRef.current;
    const img = imgRef.current;
    const trails = trailsRef.current;
    const overlay = overlayRef.current;
    const copy = copyRef.current;
    if (!stage || !camera || !img || !trails || !overlay) return;

    // A focal point sweeps from downtown out to the Bay Bridge and is held
    // right of the text on desktop, centred on phones.
    const placeCamera = (t: number) => {
      const vw = stage.clientWidth;
      const bw = camera.clientWidth;
      const bh = camera.clientHeight;
      const dw = Math.max(bw, bh * IMG_ASPECT);
      const imgLeft = (bw - dw) / 2;
      const desktop = vw >= 1024;
      const anchor = desktop ? 0.7 : 0.5;
      const w = (t / PAN_PERIOD) * Math.PI * 2;
      const focus = desktop ? 0.44 + 0.28 * (0.5 - 0.5 * Math.cos(w)) : 0.56 + 0.13 * Math.sin(w);
      const x = Math.min(0, Math.max(vw - bw, anchor * vw - (imgLeft + focus * dw)));
      const y = Math.sin(w * 0.75) * bh * 0.016;
      const s = 1 + 0.045 * (0.5 - 0.5 * Math.cos(w * 0.5));
      camera.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
    };

    let scene: CityScene | null = null;
    const measure = () => {
      if (!copy || !scene) return;
      const a = copy.getBoundingClientRect();
      const b = camera.getBoundingClientRect();
      const s = b.width / Math.max(1, camera.clientWidth);
      scene.setQuietZone({ x: (a.left - b.left) / s, y: (a.top - b.top) / s, w: a.width / s, h: a.height / s });
    };

    scene = createCityScene({
      host: camera,
      img,
      trails,
      overlay,
      scene: SF_DUSK_SCENE,
      reducedMotion: reduced,
      onFrame: (o, t) => {
        cb.current.onFrame(o);
        placeCamera(t);
        measure();
      },
    });
    placeCamera(0);
    measure();
    cb.current.onReady(scene);
    const copyObserver = new ResizeObserver(() => {
      placeCamera(0);
      measure();
    });
    if (copy) copyObserver.observe(copy);

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        if (y < window.innerHeight * 1.2) stage.style.transform = `translate3d(0, ${(y * 0.22).toFixed(1)}px, 0)`;
      });
    };
    if (!reduced) window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      copyObserver.disconnect();
      scene?.destroy();
    };
  }, [reduced, copyRef]);

  return (
    <>
      <div ref={stageRef} className="absolute inset-0 -z-10 overflow-hidden will-change-transform">
        <div
          ref={cameraRef}
          className="absolute left-0 top-[-6%] h-[112%] w-[220%] origin-center will-change-transform sm:w-[165%] lg:w-[132%]"
        >
          <img
            ref={imgRef}
            src={`${IMG}-1600.webp`}
            srcSet={`${IMG}-1080.webp 1080w, ${IMG}-1600.webp 1600w, ${IMG}-2400.webp 2400w`}
            sizes="(min-width: 1024px) 132vw, 100vw"
            width={2400}
            height={1350}
            alt="San Francisco at dusk, looking down Market Street toward downtown, the Salesforce Tower and the Bay Bridge."
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center"
            style={{ filter: 'saturate(0.96) contrast(1.05)' }}
          />
          <canvas ref={trailsRef} aria-hidden="true" className="absolute inset-0 hidden h-full w-full lg:block" />
          <canvas ref={overlayRef} aria-hidden="true" className="absolute inset-0 hidden h-full w-full lg:block" />
        </div>
      </div>
      <Fog className="-z-10 top-[22%] h-[26%]" opacity={0.13} duration={140} />
    </>
  );
};
