import { useEffect } from "react";
import { ease, loadFabric, type Fabric } from "../../fabric/motion";

type Setup = (f: Fabric, el: HTMLElement) => void;

/** Runs a section's motion inside its own GSAP context, lazily. */
function useSectionMotion(selector: string, setup: Setup) {
  useEffect(() => {
    let ctx: { revert: () => void } | undefined;
    let alive = true;
    loadFabric().then((f) => {
      const el = document.querySelector<HTMLElement>(selector);
      if (!f || !alive || !el) return;
      ctx = f.gsap.context(() => setup(f, el), el);
    });
    return () => {
      alive = false;
      ctx?.revert();
    };
  }, []);
}

const DESKTOP = "(min-width: 900px)";
const FINE = "(hover: hover) and (pointer: fine)";

/* Our Work: each card leans toward the cursor while its paper mock-up drifts
   inside the frame as the row scrolls past. */
const work: Setup = (f, el) => {
  const mm = f.gsap.matchMedia();
  const visuals = [...el.querySelectorAll<HTMLElement>(".work-visual")];
  visuals.forEach((v, i) => {
    const inner = v.firstElementChild;
    if (!inner) return;
    f.gsap.fromTo(
      inner,
      { yPercent: 10 + i * 4 },
      {
        yPercent: -10 - i * 4,
        ease: "none",
        scrollTrigger: {
          trigger: v,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.8,
        },
      },
    );
  });
  mm.add(DESKTOP, () => {
    f.gsap.from(visuals, {
      rotateX: 14,
      y: 60,
      transformOrigin: "50% 100%",
      stagger: 0.12,
      duration: 1.3,
      ease: ease.out,
      scrollTrigger: {
        trigger: el.querySelector(".work-grid"),
        start: "top 85%",
        once: true,
      },
    });
  });
  mm.add(`${DESKTOP} and ${FINE}`, () => {
    const offs = visuals.map((v) => {
      const rx = f.gsap.quickTo(v, "rotateX", {
        duration: 0.6,
        ease: "power3",
      });
      const ry = f.gsap.quickTo(v, "rotateY", {
        duration: 0.6,
        ease: "power3",
      });
      const move = (e: PointerEvent) => {
        const r = v.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 10);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
      };
      const leave = () => {
        rx(0);
        ry(0);
      };
      const card = v.closest("article") ?? v;
      card.addEventListener("pointermove", move as EventListener);
      card.addEventListener("pointerleave", leave);
      return () => {
        card.removeEventListener("pointermove", move as EventListener);
        card.removeEventListener("pointerleave", leave);
      };
    });
    return () => offs.forEach((off) => off());
  });
};
export const useWorkMotion = () => useSectionMotion("#work", work);

/* Founder: the portrait drifts within its frame while a champagne line draws
   down beside the story. A lighter, unpinned moment after Our Work. */
const founder: Setup = (f, el) => {
  const img = el.querySelector(".founder-portrait img");
  const line = el.querySelector(".fd-line");
  if (img) {
    f.gsap.fromTo(
      img,
      { yPercent: -6, scale: 1.14 },
      {
        yPercent: 6,
        scale: 1.04,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.8,
        },
      },
    );
  }
  if (line) {
    f.gsap.fromTo(
      line,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: el.querySelector(".founder-copy"),
          start: "top 80%",
          end: "bottom 60%",
          scrub: 0.6,
        },
      },
    );
  }
};
export const useFounderMotion = () => useSectionMotion("#founder", founder);

/* Process: one champagne thread runs through Discover, Design and Deliver,
   lighting each step as it arrives. Scrubbed, not pinned. */
const processThread: Setup = (f, el) => {
  const grid = el.querySelector(".process-grid");
  if (!grid) return;
  const mm = f.gsap.matchMedia();
  const steps = [...grid.querySelectorAll("article")];
  const light = (progress: number, at: number[]) =>
    steps.forEach((s, i) => s.classList.toggle("is-lit", progress >= at[i]));
  mm.add("(min-width: 851px)", () => {
    const path = grid.querySelector(".ps-thread-lit");
    f.gsap.set(path, { strokeDasharray: 1, strokeDashoffset: 1 });
    f.gsap.to(path, {
      strokeDashoffset: 0,
      ease: "none",
      scrollTrigger: {
        trigger: grid,
        start: "top 78%",
        end: "bottom 55%",
        scrub: 0.7,
        onUpdate: (self) => light(self.progress, [0.02, 0.36, 0.7]),
      },
    });
  });
  mm.add("(max-width: 850px)", () => {
    const line = grid.querySelector(".ps-vline");
    f.gsap.fromTo(
      line,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: grid,
          start: "top 75%",
          end: "bottom 60%",
          scrub: 0.6,
          onUpdate: (self) => light(self.progress, [0.02, 0.4, 0.78]),
        },
      },
    );
  });
};
export const useProcessMotion = () =>
  useSectionMotion("#process", processThread);

/* Auburn band: the street pans slowly sideways while the line holds still,
   a pinned breath before the finale. Mobile keeps a gentle parallax. */
const auburn: Setup = (f, el) => {
  const img = el.querySelector(".li-stage > img");
  const copy = el.querySelector(".li-stage > .page-width");
  if (!img || !copy) return;
  const mm = f.gsap.matchMedia();
  mm.add("(min-width: 900px) and (min-height: 640px)", () => {
    f.gsap
      .timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.8,
        },
      })
      .fromTo(
        img,
        { xPercent: 0, scale: 1.06 },
        { xPercent: -20, scale: 1, duration: 1 },
        0,
      )
      .fromTo(copy, { x: 40 }, { x: -20, duration: 1 }, 0);
  });
  mm.add("not all and (min-width: 900px) and (min-height: 640px)", () => {
    f.gsap.fromTo(
      img,
      { yPercent: -6 },
      {
        yPercent: 6,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );
  });
};
export const useAuburnMotion = () =>
  useSectionMotion(".local-interlude", auburn);
