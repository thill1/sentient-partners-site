import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { CA_IMAGES, type CaImageKey } from '../../content/californiaContent';
import { createCityScene, type SceneDef } from './hero/cityScene';

const IMAGE_ROOT = '/concept/california';
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface PhotoProps {
  image: CaImageKey;
  /** object-position, so crops hold the subject on narrow screens. */
  position?: string;
  className?: string;
  /** Set when the photo is purely atmospheric and adjacent text carries the meaning. */
  decorative?: boolean;
  /** Fill the nearest positioned ancestor (full-bleed backgrounds). Otherwise size via className. */
  fill?: boolean;
  /** Rendered width hint for srcset selection. */
  sizes?: string;
  /** Scroll parallax strength; 0 disables. */
  parallax?: number;
  /** Live traffic and aircraft layered over the photograph. */
  scene?: SceneDef;
  /** Scene caption, e.g. "9:47 PM, Golden Gate". */
  caption?: string;
  captionClassName?: string;
}

/**
 * Photography as architecture. One cinematic grade for every image, a light
 * contrast lift, vignette, and film grain, so a night bridge, a redwood
 * forest, and a dawn skyline read as one body of work. Each photograph
 * settles into place as it enters view; some drift with scroll; some carry a
 * live scene.
 */
export const Photo: React.FC<PhotoProps> = ({
  image,
  position = 'center',
  className = '',
  decorative = false,
  fill = false,
  sizes = '100vw',
  parallax = 0,
  scene,
  caption,
  captionClassName = 'bottom-5 right-5 sm:bottom-7 sm:right-8',
}) => {
  const { name, alt, width, height } = CA_IMAGES[image];
  const outerRef = useRef<HTMLDivElement>(null);
  const moveRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const trailsRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [settled, setSettled] = useState(false);

  // Settle on entry; drift with scroll.
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      setSettled(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSettled(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        if (r.bottom < -80 || r.top > vh + 80 || !moveRef.current) return;
        const max = r.height * 0.065;
        const offset = Math.max(-max, Math.min(max, (r.top + r.height / 2 - vh / 2) * -parallax));
        moveRef.current.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
    };
    if (parallax) {
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [parallax]);

  // Optional live scene.
  useEffect(() => {
    const host = stageRef.current;
    const img = imgRef.current;
    const trails = trailsRef.current;
    const overlay = overlayRef.current;
    if (!scene || !host || !img || !trails || !overlay) return;
    const live = createCityScene({ host, img, trails, overlay, scene, reducedMotion: prefersReducedMotion() });
    live.setTarget(1, true);
    return () => live.destroy();
  }, [scene]);

  return (
    <div ref={outerRef} className={`${fill ? 'absolute inset-0' : 'relative'} isolate overflow-hidden bg-ca-deep ${className}`}>
      <div ref={moveRef} className={`absolute inset-x-0 ${parallax ? '-inset-y-[7%]' : 'inset-y-0'} will-change-transform`}>
        <div
          ref={stageRef}
          className={`absolute inset-0 transition-transform duration-[2800ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none ${
            settled ? 'scale-100' : 'scale-[1.07]'
          }`}
        >
          <img
            ref={imgRef}
            src={`${IMAGE_ROOT}/${name}-2400.webp`}
            srcSet={`${IMAGE_ROOT}/${name}-1080.webp 1080w, ${IMAGE_ROOT}/${name}-2400.webp 2400w`}
            sizes={sizes}
            width={width}
            height={height}
            alt={decorative ? '' : alt}
            aria-hidden={decorative || undefined}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: position, filter: 'saturate(0.95) contrast(1.05)' }}
          />
          {scene && (
            <>
              <canvas ref={trailsRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
              <canvas ref={overlayRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
            </>
          )}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,12,28,0)_52%,rgba(6,12,28,0.5)_100%)]"
      />
      <Grain opacity={0.07} />
      {caption && <SceneCaption className={captionClassName}>{caption}</SceneCaption>}
    </div>
  );
};

/** A small, film-slate caption: place and time. */
export const SceneCaption: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p
    className={`pointer-events-none absolute z-10 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ca-ivory/80 [text-shadow:0_1px_10px_rgba(6,12,28,0.85)] ${className}`}
  >
    {children}
  </p>
);

/** True once the element has scrolled into view (immediately under reduced motion). */
export function useInViewOnce<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/** Reveal once on scroll: a short rise and fade. Respects reduced motion. */
export const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'li';
}> = ({ children, className = '', delay = 0, as = 'div' }) => {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref}
      className={`transition-[opacity,transform] duration-[1100ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      } ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Tag>
  );
};

type ButtonTone = 'onLight' | 'onDark';

interface CaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  variant?: 'solid' | 'line';
}

/** Architectural buttons: square-shouldered, no glow. */
export const CaButton: React.FC<CaButtonProps> = ({
  tone = 'onLight',
  variant = 'solid',
  className = '',
  children,
  ...props
}) => {
  const base =
    'group inline-flex min-h-[48px] items-center justify-center gap-3 rounded-[2px] px-6 text-[15px] font-medium tracking-[0.01em] transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
  const styles = {
    onLight: {
      solid: 'bg-ca-navy text-ca-ivory hover:bg-ca-deep focus-visible:ring-ca-navy focus-visible:ring-offset-ca-ivory',
      line: 'border border-ca-navy/30 text-ca-navy hover:border-ca-navy focus-visible:ring-ca-navy focus-visible:ring-offset-ca-ivory',
    },
    onDark: {
      solid: 'bg-ca-ivory text-ca-navy hover:bg-white focus-visible:ring-ca-ivory focus-visible:ring-offset-ca-deep',
      line: 'border border-ca-ivory/35 text-ca-ivory hover:border-ca-ivory focus-visible:ring-ca-ivory focus-visible:ring-offset-ca-deep',
    },
  } as const;

  return (
    <button type="button" className={`${base} ${styles[tone][variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

/** A drawn arrow, in the same stroke as the page's other icons. */
export const Arrow: React.FC = () => (
  <ArrowRight
    aria-hidden="true"
    strokeWidth={1.75}
    className="h-[1.05em] w-[1.05em] transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
  />
);

/**
 * Keeps a hyphenated compound ("response-system") together at line ends, so a
 * heading never breaks inside one.
 */
export const keepCompounds = (text: string): React.ReactNode[] =>
  text.split(/(\S+-\S+)/).map((part, i) =>
    i % 2 ? (
      <span key={i} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );

const GRAIN_SVG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")";

/** Film grain for photographic moments. Static under reduced motion. */
export const Grain: React.FC<{ className?: string; opacity?: number }> = ({ className = '', opacity = 0.09 }) => (
  <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
    <div
      className="absolute -inset-[6%] animate-ca-grain mix-blend-overlay motion-reduce:animate-none"
      style={{ backgroundImage: GRAIN_SVG, opacity }}
    />
  </div>
);
