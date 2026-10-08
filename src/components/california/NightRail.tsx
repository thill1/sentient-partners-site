import React, { useEffect, useRef, useState } from 'react';
import { CA_NIGHT } from '../../content/californiaContent';
import { scrollToSection } from '../../lib/siteActions';

/** Minutes after 7:00 PM, so the night runs forward past midnight. */
const toMinutes = (h: number, m: number, pm: boolean) => ((pm ? h % 12 + 12 : h % 12) * 60 + m - 19 * 60 + 1440) % 1440;
const parse = (clock: string) => {
  const [, h, m, ap] = clock.match(/(\d+):(\d+)\s*(AM|PM)/i) ?? ['', '7', '00', 'PM'];
  return toMinutes(Number(h), Number(m), ap.toUpperCase() === 'PM');
};
const format = (mins: number) => {
  const total = (Math.round(mins) + 19 * 60) % 1440;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  return `${h24 % 12 || 12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
};

const RAIL = 260; // px
const SCENES = CA_NIGHT.map((s) => ({ ...s, at: parse(s.time) }));
const FIRST = SCENES[0].at;
const LAST = SCENES[SCENES.length - 1].at;
const pos = (mins: number) => ((mins - FIRST) / (LAST - FIRST)) * RAIL;

/**
 * The page is one night. A slim rail on the right edge carries a clock that
 * advances from dusk to dawn as you read, with a tick for each scene.
 * Desktop only; it adapts to light and dark sections like the header.
 */
export const NightRail: React.FC = () => {
  const scenes = SCENES;
  const [now, setNow] = useState(FIRST);
  const [show, setShow] = useState(false);
  const [dark, setDark] = useState(true);
  const railRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const mid = window.innerHeight * 0.5;
      // Interpolate between the scenes whose tops bracket the viewport centre.
      const tops = scenes.map((s) => {
        const el = document.getElementById(s.id);
        return el ? el.getBoundingClientRect().top + el.offsetHeight * 0.35 : Infinity;
      });
      let mins = scenes[0].at;
      for (let i = 0; i < scenes.length - 1; i++) {
        const a = tops[i];
        const b = tops[i + 1];
        if (mid >= a && mid < b) {
          mins = scenes[i].at + ((mid - a) / (b - a)) * (scenes[i + 1].at - scenes[i].at);
          break;
        }
        if (mid >= b) mins = scenes[i + 1].at;
      }
      setNow(mins);
      // Stay out of the way over the hero (it has its own clock).
      setShow(window.scrollY > window.innerHeight * 0.75);

      const rail = railRef.current;
      if (rail) {
        const r = rail.getBoundingClientRect();
        const y = r.top + r.height / 2;
        setDark(
          Array.from(document.querySelectorAll<HTMLElement>('[data-ca-tone="dark"]')).some((el) => {
            const b = el.getBoundingClientRect();
            return b.top <= y && b.bottom > y;
          }),
        );
      }
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
  }, [scenes]);

  const ink = dark ? 'text-ca-ivory' : 'text-ca-navy';
  const line = dark ? 'bg-ca-ivory/25' : 'bg-ca-navy/20';

  return (
    <nav
      ref={railRef}
      aria-label="The night, scene by scene"
      className={`pointer-events-none fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 transition-[color,opacity] duration-500 xl:block min-[1600px]:right-6 ${ink} ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="relative" style={{ height: RAIL }}>
        <span aria-hidden="true" className={`absolute right-[3px] top-0 h-full w-px transition-colors duration-500 ${line}`} />
        {scenes.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => scrollToSection(s.id)}
            aria-label={`${s.place}, ${s.time}`}
            tabIndex={show ? 0 : -1}
            className="group pointer-events-auto absolute right-0 flex -translate-y-1/2 items-center gap-3 py-1 focus:outline-none"
            style={{ top: pos(s.at) }}
          >
            <span className="whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.14em] opacity-0 transition-opacity duration-300 group-hover:opacity-80 group-focus-visible:opacity-80">
              {s.place}
            </span>
            <span aria-hidden="true" className={`block h-px w-[7px] ${dark ? 'bg-ca-ivory/60' : 'bg-ca-navy/50'} group-focus-visible:w-3`} />
          </button>
        ))}
        {/* The clock */}
        <div
          aria-hidden="true"
          className="absolute right-0 flex -translate-y-1/2 items-center gap-3 transition-[top] duration-300 ease-out"
          style={{ top: pos(now) }}
        >
          <span className="hidden whitespace-nowrap font-mono text-[11px] tabular-nums tracking-[0.08em] opacity-85 min-[1600px]:inline">{format(now)}</span>
          <span className="block h-[7px] w-[7px] bg-ca-orange shadow-[0_0_12px_2px_rgba(200,69,43,0.45)]" />
        </div>
      </div>
    </nav>
  );
};
