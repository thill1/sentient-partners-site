import { useEffect } from "react";

/**
 * Below the hero, headings and rows rise into view as they arrive, echoing
 * the fog's slow drift. Content stays visible without JS, and visitors who
 * prefer reduced motion see everything in place immediately.
 */
export function useScrollReveal() {
  useEffect(() => {
    const root = document.querySelector(".atmosphere-page");
    if (!root) return;
    const selector = [
      "main > section:not(.golden-gate) .section-heading",
      ".perspective-layout > *",
      ".connected-inner > *",
      ".work-grid > article",
      ".founder-layout > *",
      ".process-grid > article",
      ".local-interlude .page-width",
      ".contact-section .page-width > *",
      ".reveal",
    ].join(",");
    const targets = Array.from(root.querySelectorAll<HTMLElement>(selector));
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return;
    root.classList.add("reveal-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    targets.forEach((el, i) => {
      el.classList.add("reveal-item");
      el.style.setProperty("--reveal-delay", `${(i % 4) * 90}ms`);
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
}
