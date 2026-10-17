import { useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";
import { ease, loadFabric, type Fabric } from "../../fabric/motion";

/* A large serif wordmark rises out of the footer, with a quiet way home. */
export default function FooterFinale() {
  const root = useRef<HTMLDivElement>(null);
  const fabric = useRef<Fabric | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let ctx: { revert: () => void } | undefined;
    let alive = true;
    loadFabric().then((f) => {
      if (!f || !alive) return;
      fabric.current = f;
      ctx = f.gsap.context(() => {
        const split = f.SplitText.create(el.querySelector(".ff-wordmark"), {
          type: "chars",
          mask: "chars",
        });
        f.gsap.from(split.chars, {
          yPercent: 105,
          stagger: 0.025,
          duration: 1.2,
          ease: ease.out,
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
        f.gsap.from(el.querySelector(".ff-top"), {
          autoAlpha: 0,
          y: 10,
          duration: 0.8,
          delay: 0.5,
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
      }, el);
    });
    return () => {
      alive = false;
      ctx?.revert();
    };
  }, []);

  const toTop = () => {
    const lenis = fabric.current?.lenis;
    if (lenis) lenis.scrollTo(0, { duration: 2.2 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
    document.getElementById("main-content")?.focus({ preventScroll: true });
  };

  return (
    <div ref={root} className="footer-finale page-width">
      <p className="ff-wordmark" aria-hidden="true">
        Sentient <em>Partners</em>
      </p>
      <button type="button" className="ff-top" onClick={toTop}>
        Back to top <ArrowUp size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
