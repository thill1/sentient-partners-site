import { useEffect, useRef, useState } from 'react';

/**
 * How far down a list the reader has got: the last child whose top has passed
 * a line a little below the middle of the screen (-1 before the first). Also
 * reports where that row and the last row sit inside the list (the list must be
 * positioned), so a line can be drawn down to them. Under reduced motion every
 * row counts as reached, so nothing waits on scrolling.
 */
export function useReached<T extends HTMLElement>(count: number) {
  const ref = useRef<T | null>(null);
  const [state, setState] = useState({ reached: -1, reachedTop: 0, lastTop: 0 });

  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    const rows = () => Array.from(list.children) as HTMLElement[];
    const measure = (reached: number) => {
      const r = rows();
      const top = (i: number) => (i >= 0 && r[i] ? r[i].offsetTop : 0);
      setState((prev) => {
        const next = { reached, reachedTop: top(reached), lastTop: top(r.length - 1) };
        return prev.reached === next.reached && prev.reachedTop === next.reachedTop && prev.lastTop === next.lastTop ? prev : next;
      });
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      measure(count - 1);
      const onResize = () => measure(count - 1);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.58;
      let last = -1;
      rows().forEach((child, i) => {
        if (child.getBoundingClientRect().top + 24 < line) last = i;
      });
      measure(last);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [count]);

  return { ref, ...state };
}
