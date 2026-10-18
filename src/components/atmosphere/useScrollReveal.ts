import { useEffect } from "react";
import {
  loadFabric,
  parallax,
  revealBlocks,
  revealText,
} from "../../fabric/motion";

/**
 * Applies the fabric's shared motion to every section below the hero:
 * masked line reveals on headlines, a batched rise for rows and figures, and
 * slow parallax on photography. Without motion, everything simply renders.
 */
export function useScrollReveal() {
  useEffect(() => {
    let ctx: { revert: () => void } | undefined;
    let alive = true;
    loadFabric().then((f) => {
      const root = document.querySelector<HTMLElement>(".atmosphere-page");
      if (!f || !alive || !root) return;
      ctx = f.gsap.context(() => {
        const below =
          "main > section:not(.golden-gate):not(.perspective-v2):not(.outcomes-v2):not(.capabilities-v2):not(.contact-v2)";
        root
          .querySelectorAll<HTMLElement>(
            `${below} h2, .local-interlude p:not(.eyebrow)`,
          )
          .forEach((el) => revealText(f, el));
        revealBlocks(f, [
          ...root.querySelectorAll(
            [
              `${below} .eyebrow`,
              `${below} .section-heading > p`,
              ".connected-inner > div > p",
              ".connection-story",
              ".work-grid > article",
              ".founder-portrait",
              ".founder-copy > :not(h2):not(.eyebrow):not(.fd-line)",
              ".process-grid > article",
              ".contact-section .page-width > :not(h2):not(.eyebrow)",
            ].join(","),
          ),
        ]);
        root
          .querySelectorAll(".local-interlude > img, .contact-backdrop")
          .forEach((el) => parallax(f, el, 8, el.parentElement ?? el));
      }, root);
    });
    return () => {
      alive = false;
      ctx?.revert();
    };
  }, []);
}
