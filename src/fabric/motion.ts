/**
 * Shared motion vocabulary for the page fabric. GSAP and Lenis load lazily
 * (after first paint) so they never compete with the hero for the main thread.
 */
import type { gsap as GSAP } from "gsap";
import type { ScrollTrigger as ST } from "gsap/ScrollTrigger";
import type { SplitText as Split } from "gsap/SplitText";
import type Lenis from "lenis";

export const ease = {
  out: "expo.out",
  soft: "power3.out",
  inOut: "power2.inOut",
  drift: "sine.inOut",
} as const;

export const duration = {
  fast: 0.45,
  base: 0.9,
  slow: 1.4,
  stagger: 0.09,
} as const;

export interface Fabric {
  gsap: typeof GSAP;
  ScrollTrigger: typeof ST;
  SplitText: typeof Split;
  lenis: Lenis | null;
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

let fabric: Promise<Fabric | null> | null = null;

/** Loads GSAP + plugins and starts Lenis on the GSAP ticker. Null under reduced motion. */
export function loadFabric(): Promise<Fabric | null> {
  if (typeof window === "undefined" || prefersReducedMotion())
    return Promise.resolve(null);
  fabric ??= (async () => {
    const [{ gsap }, { ScrollTrigger }, { SplitText }, { default: LenisCtor }] =
      await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("gsap/SplitText"),
        import("lenis"),
      ]);
    gsap.registerPlugin(ScrollTrigger, SplitText);
    gsap.defaults({ ease: ease.out, duration: duration.base });
    const lenis = new LenisCtor({
      lerp: 0.1,
      wheelMultiplier: 1,
      anchors: { offset: -96 },
      autoRaf: false,
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    return { gsap, ScrollTrigger, SplitText, lenis };
  })();
  return fabric;
}

/** Masked line (or word) reveal for real text, re-splitting on resize. */
export function revealText(
  f: Fabric,
  el: HTMLElement,
  opts: { type?: "lines" | "words"; delay?: number; start?: string } = {},
) {
  const type = opts.type ?? "lines";
  return f.SplitText.create(el, {
    type,
    mask: type,
    autoSplit: true,
    onSplit(self) {
      const targets = type === "lines" ? self.lines : self.words;
      return f.gsap.from(targets, {
        yPercent: 112,
        rotate: 1.5,
        duration: duration.slow,
        stagger: type === "lines" ? duration.stagger : 0.035,
        delay: opts.delay ?? 0,
        scrollTrigger: {
          trigger: el,
          start: opts.start ?? "top 88%",
          once: true,
        },
      });
    },
  });
}

/** Fade-and-rise for blocks (rows, figures, cards), batched for performance. */
export function revealBlocks(f: Fabric, targets: Element[]) {
  if (!targets.length) return;
  f.gsap.set(targets, { autoAlpha: 0, y: 32 });
  f.ScrollTrigger.batch(targets, {
    start: "top 90%",
    once: true,
    onEnter: (batch) =>
      f.gsap.to(batch, {
        autoAlpha: 1,
        y: 0,
        duration: duration.slow,
        stagger: duration.stagger,
        overwrite: true,
      }),
  });
}

/** Parallax a layer by a fraction of its trigger's travel. */
export function parallax(
  f: Fabric,
  el: Element,
  amount: number,
  trigger: Element = el,
) {
  return f.gsap.fromTo(
    el,
    { yPercent: -amount },
    {
      yPercent: amount,
      ease: "none",
      scrollTrigger: {
        trigger,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    },
  );
}

/**
 * Pinned sequence without pin-spacers: the section is a tall CSS track with a
 * sticky stage, so its height is known at first paint (no layout shift). The
 * timeline scrubs across the track.
 */
export function stickySequence(
  f: Fabric,
  track: Element,
  build: (tl: GSAPTimeline) => void,
) {
  const tl = f.gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.8,
    },
  });
  build(tl);
  return tl;
}
