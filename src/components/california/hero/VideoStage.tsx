import React, { useEffect, useRef, useState } from 'react';
import spMonogramWhite from '../../../assets/sp-monogram-white.png';
import { createSignalLayer, type SignalLayer } from './signalLayer';
import { loadTrack } from './trackData';
import type { HeroStage, StageProps } from './stage';

const BASE = '/concept/california/sf-bay';
/** The tracking data is in the coordinates of the full 1600x900 frame. */
const FRAME_W = 1600;
const FRAME_H = 900;
/** On narrow screens, centre the frame here (0..1): the waterfront below the towers. */
const FOCUS_U = 0.46;

/**
 * Cuts of the same loop. The phone cut shows only the part of the frame a
 * portrait screen can use, starting just above the skyline, so it stays sharp
 * and the scene sits in the band above the headline.
 */
const CUTS = {
  full: { name: '1600', crop: { x: 0, y: 0, w: 1600, h: 900 } },
  light: { name: '960', crop: { x: 0, y: 0, w: 1600, h: 900 } },
  phone: { name: 'phone', crop: { x: 352, y: 180, w: 704, h: 720 } },
};
type Cut = keyof typeof CUTS;

const pickCut = (): Cut => {
  if (typeof window === 'undefined') return 'full';
  const compact = Math.min(window.innerWidth, window.innerHeight) < 700;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (compact && window.innerHeight > window.innerWidth) return 'phone';
  return compact || saveData ? 'light' : 'full';
};

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

/**
 * Real footage: the camera pans slowly across the San Francisco waterfront at
 * blue hour, from the Bay Bridge to the downtown towers and back (Advancer
 * Drones, Pexels), graded and looped. Over it, the communications layer:
 * calls, emails and texts anchored to points tracked through the footage, so
 * they sit on real rooftops, piers and the bridge deck as the camera moves.
 * Clicking the city places a call from the nearest building.
 */
export const VideoStage: React.FC<StageProps> = ({ reduced, copyRef, onReady, onFrame, onFail, onTally, onCanSend, onSend }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<VideoWithFrameCallback>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cb = useRef({ onReady, onFrame, onFail, onTally, onCanSend, onSend });
  cb.current = { onReady, onFrame, onFail, onTally, onCanSend, onSend };
  const [cut] = useState(pickCut);

  useEffect(() => {
    const host = hostRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!host || !video || !canvas) return;

    const compact = Math.min(window.innerWidth, window.innerHeight) < 700;
    const { name, crop } = CUTS[cut];
    video.src = `${BASE}-${name}.mp4`;

    // Compose: cover the hero. On wide screens keep the frame's left edge, so the
    // city sits behind the headline and the bridge and waterfront open to its right.
    // `box` is where the full frame would sit, which is what the tracking data needs.
    let box = { left: 0, top: 0, width: 1, height: 1 };
    const layout = () => {
      const W = host.clientWidth;
      const H = host.clientHeight;
      const wide = W / H > 1.15;
      const s = Math.max(W / crop.w, H / crop.h);
      const vw = crop.w * s;
      const vh = crop.h * s;
      const focus = (FOCUS_U * FRAME_W - crop.x) * s;
      const left = wide ? 0 : Math.min(0, Math.max(W - vw, W / 2 - focus));
      const top = Math.min(0, Math.max(H - vh, (H - vh) * 0.5));
      box = { left: left - crop.x * s, top: top - crop.y * s, width: FRAME_W * s, height: FRAME_H * s };
      Object.assign(video.style, { left: `${left}px`, top: `${top}px`, width: `${vw}px`, height: `${vh}px` });
    };
    layout();

    // The presented frame's media time keeps the overlay locked to the picture.
    let mediaTime: number | null = null;
    let vfc = 0;
    const onVideoFrame = (_: number, meta: { mediaTime: number }) => {
      mediaTime = meta.mediaTime;
      vfc = video.requestVideoFrameCallback?.(onVideoFrame) ?? 0;
    };
    if (video.requestVideoFrameCallback) vfc = video.requestVideoFrameCallback(onVideoFrame);
    // If the video can't present frames (autoplay blocked, slow network), hold the
    // poster frame's time after a short wait so the overlay still runs over it.
    const started = performance.now();
    const getVideoTime = () => {
      if (video.readyState < 2) return performance.now() - started > 2500 ? 0 : null;
      return mediaTime ?? video.currentTime;
    };

    let layer: SignalLayer | null = null;
    let cancelled = false;
    let userPaused = false;
    let inView = true;

    const play = () => {
      if (reduced || userPaused || !inView || document.hidden) return;
      video.play().catch(() => {
        // Autoplay can be refused (Low Power Mode, data saver). The poster and
        // the overlay still carry the scene.
      });
    };

    const stage: HeroStage = {
      setTarget: (o, immediate) => layer?.setTarget(o, immediate),
      setPaused: (p) => {
        userPaused = p;
        layer?.setPaused(p);
        if (p) video.pause();
        else play();
      },
    };

    loadTrack(`${BASE}-track.bin`)
      .then((track) => {
        if (cancelled) return;
        layer = createSignalLayer({
          canvas,
          track,
          getVideoTime,
          getVideoRect: () => box,
          getQuietRect: () => {
            // The headline block's own container is full width; measure what's in it.
            const c = copyRef.current;
            if (!c) return null;
            const b = host.getBoundingClientRect();
            let x0 = Infinity;
            let y0 = Infinity;
            let x1 = -Infinity;
            let y1 = -Infinity;
            c.querySelectorAll('h1, p, button').forEach((el) => {
              const r = el.getBoundingClientRect();
              if (!r.width) return;
              // Text boxes can be wider than their lines; measure the lines.
              const range = document.createRange();
              range.selectNodeContents(el);
              const t = el.tagName === 'BUTTON' ? r : range.getBoundingClientRect();
              x0 = Math.min(x0, t.left);
              y0 = Math.min(y0, t.top);
              x1 = Math.max(x1, t.right);
              y1 = Math.max(y1, t.bottom);
            });
            if (!isFinite(x0)) return null;
            return { left: x0 - b.left, top: y0 - b.top, width: x1 - x0, height: y1 - y0 };
          },
          reducedMotion: reduced,
          compact,
          hubMark: spMonogramWhite,
          onFrame: (o) => cb.current.onFrame(o),
          onTally: (t) => cb.current.onTally?.(t),
        });
        cb.current.onReady(stage);
        if (!reduced) cb.current.onCanSend?.();
      })
      .catch(() => cb.current.onFail?.());

    const onError = () => cb.current.onFail?.();
    video.addEventListener('error', onError);

    // Clicking the city (anywhere in the hero that isn't text or a control) places
    // a call from the nearest building.
    const section = host.parentElement;
    const onClick = (e: MouseEvent) => {
      if (window.innerWidth < 1024 || !layer || e.defaultPrevented || e.button !== 0) return;
      const el = e.target as Element | null;
      if (el?.closest('a, button, input, textarea, select, label, h1, h2, p, [role="group"]')) return;
      if (!window.getSelection()?.isCollapsed) return;
      const b = canvas.getBoundingClientRect();
      if (layer.send(e.clientX - b.left, e.clientY - b.top)) cb.current.onSend?.();
    };
    section?.addEventListener('click', onClick);
    const ro = new ResizeObserver(() => {
      layout();
      layer?.resize();
    });
    ro.observe(host);
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (inView) play();
      else video.pause();
    });
    io.observe(host);
    const onVis = () => (document.hidden ? video.pause() : play());
    document.addEventListener('visibilitychange', onVis);

    // Drift gently with the page as it scrolls.
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        if (y < window.innerHeight * 1.2) host.style.transform = `translate3d(0, ${(y * 0.2).toFixed(1)}px, 0)`;
      });
    };
    if (!reduced) window.addEventListener('scroll', onScroll, { passive: true });
    play();

    return () => {
      cancelled = true;
      if (vfc) video.cancelVideoFrameCallback?.(vfc);
      if (frame) cancelAnimationFrame(frame);
      video.removeEventListener('error', onError);
      section?.removeEventListener('click', onClick);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('scroll', onScroll);
      layer?.destroy();
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [reduced, copyRef, cut]);

  return (
    <div ref={hostRef} className="absolute inset-0 -z-10 overflow-hidden bg-ca-deep will-change-transform">
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        preload="auto"
        poster={`${BASE}-poster-${CUTS[cut].name}.webp`}
        aria-hidden="true"
        tabIndex={-1}
        className="absolute max-w-none object-cover"
      />
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 hidden h-full w-full lg:block" />
    </div>
  );
};
