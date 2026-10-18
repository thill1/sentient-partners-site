import { useEffect, useRef } from "react";
import { loadFabric } from "./motion";
import "./fabric.css";

/**
 * A page-wide atmosphere that carries the hero's air down the site: film
 * grain and two fog banks that drift, thickening with scroll velocity, plus
 * a champagne scroll-progress hairline. It stays out of the hero entirely.
 */
export default function PageAtmosphere() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let frame = 0;
    let cleanup = () => {};
    const measure = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      const hero = document.querySelector(".golden-gate");
      const heroEnd = hero
        ? hero.getBoundingClientRect().bottom + scrollY - innerHeight * 0.6
        : 0;
      el.style.setProperty("--progress", String(max > 0 ? scrollY / max : 0));
      el.classList.toggle("is-past-hero", scrollY > heroEnd);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    // Let the hero settle its own height first; elements that hang off its
    // edge (like the Perspective seam) appear only after that.
    const ready = requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document.documentElement.classList.add("fabric-ready"),
      ),
    );
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    let alive = true;
    loadFabric().then((f) => {
      if (!f || !alive) return;
      // Velocity feeds the fog: fast scrolling stirs it, rest lets it settle.
      const setV = f.gsap.quickTo(el, "--velocity", {
        duration: 1.2,
        ease: "power3.out",
      });
      const tick = () => {
        setV(Math.min(1, Math.abs(f.lenis?.velocity ?? 0) / 40));
      };
      f.gsap.ticker.add(tick);
      cleanup = () => f.gsap.ticker.remove(tick);
    });
    return () => {
      alive = false;
      cleanup();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(ready);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div ref={root} className="page-atmosphere" aria-hidden="true">
      <div className="pa-stir pa-stir-a">
        <div className="pa-fog pa-fog-a" />
      </div>
      <div className="pa-stir pa-stir-b">
        <div className="pa-fog pa-fog-b" />
      </div>
      <div className="pa-grain" />
      <div className="pa-progress" />
    </div>
  );
}
