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
        scrollTrigger: { trigger: v, start: "top bottom", end: "bottom top", scrub: 0.8 },
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
      scrollTrigger: { trigger: el.querySelector(".work-grid"), start: "top 85%", once: true },
    });
  });
  mm.add(`${DESKTOP} and ${FINE}`, () => {
    const offs = visuals.map((v) => {
      const rx = f.gsap.quickTo(v, "rotateX", { duration: 0.6, ease: "power3" });
      const ry = f.gsap.quickTo(v, "rotateY", { duration: 0.6, ease: "power3" });
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
