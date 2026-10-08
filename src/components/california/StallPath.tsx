import React, { useEffect, useRef } from 'react';

interface StallPathProps {
  /** Where an inquiry starts and where it should end up. */
  start: string;
  end: string;
  /** The places along the way where inquiries stall, in order. */
  gates: readonly string[];
  /** The gate the reader is pointing at, if any (from the table below). */
  active: number | null;
  onActive: (index: number | null) => void;
}

const NAVY = '13,31,78';
const STONE = '168,164,154';
const ORANGE = '200,69,43';
const PAD = 14; // px of path before the first node and after the last

/**
 * The thesis of the section, drawn: demand enters at one end and should leave
 * as a booked job, and it stalls at a few gates in between. Small dots are
 * inquiries. At each gate some pass; the rest pile up behind it, go grey, and
 * are lost. Nothing is counted or claimed. It shows the shape of the problem,
 * and points at the row of the table that names each gate.
 */
export const StallPath: React.FC<StallPathProps> = ({ start, end, gates, active, onActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef<number | null>(active);
  const redrawRef = useRef<() => void>(() => {});
  activeRef.current = active;

  const n = gates.length;
  const frac = (i: number) => (n === 1 ? 0.55 : 0.24 + 0.58 * (i / (n - 1)));

  useEffect(() => {
    redrawRef.current();
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    interface Dot {
      x: number;
      y: number;
      seed: number;
      /** The gate this inquiry will stall at, or n if it makes it through. */
      fate: number;
      state: 'flow' | 'stalled' | 'fading' | 'arrived';
      t: number;
      slot: number;
      alpha: number;
    }

    let seed = 90210;
    const rand = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    let W = 1;
    let H = 1;
    let dpr = 1;
    let yMid = 0;
    let startX = PAD;
    let endX = 1;
    let gateX: number[] = [];
    let speed = 80;
    let rate = 2;
    let dots: Dot[] = [];
    const slots: boolean[][] = gates.map(() => Array.from({ length: 12 }, () => false));
    const gatePulse: number[] = gates.map(() => 0);
    let endPulse = 0;
    let spawnAcc = 0;

    // The share that gets past each gate (about one in five makes it all the way).
    const PASS = 0.6;
    const pickFate = () => {
      for (let g = 0; g < n; g++) if (rand() > PASS) return g;
      return n;
    };

    const slotPos = (g: number, k: number) => ({
      x: gateX[g] - 12 - (k % 4) * 6.5 - (Math.floor(k / 4) % 2) * 3,
      y: yMid - 4 - Math.floor(k / 4) * 7 - (k % 2) * 1.5,
    });

    const spawn = () => {
      dots.push({ x: startX, y: yMid, seed: rand() * 100, fate: pickFate(), state: 'flow', t: 0, slot: -1, alpha: 0 });
    };

    const step = (dt: number) => {
      spawnAcc += dt * rate;
      while (spawnAcc >= 1) {
        spawnAcc -= 1;
        spawn();
      }
      for (let g = 0; g < n; g++) gatePulse[g] = Math.max(0, gatePulse[g] - dt * 1.6);
      endPulse = Math.max(0, endPulse - dt * 1.1);
      for (let i = dots.length - 1; i >= 0; i--) {
        const d = dots[i];
        if (d.state === 'flow') {
          const before = d.x;
          d.x += speed * dt;
          d.alpha = Math.min(1, d.alpha + dt * 3);
          d.y = yMid + Math.sin(d.seed * 7 + d.x * 0.045) * 2.2;
          for (let g = 0; g < n; g++) {
            if (d.fate === g && d.x >= gateX[g] - 14) {
              const free = slots[g].indexOf(false);
              if (free < 0) {
                d.state = 'fading';
                d.t = 0;
              } else {
                slots[g][free] = true;
                d.slot = free;
                d.state = 'stalled';
                d.t = 0;
              }
              gatePulse[g] = Math.max(gatePulse[g], 0.6);
              break;
            }
            if (before < gateX[g] && d.x >= gateX[g]) gatePulse[g] = 1;
          }
          if (d.state === 'flow' && d.x >= endX) {
            d.state = 'arrived';
            d.t = 0;
            endPulse = 1;
          }
        } else if (d.state === 'stalled') {
          const g = d.fate;
          const p = slotPos(g, d.slot);
          const k = Math.min(1, dt * 5);
          d.x += (p.x - d.x) * k;
          d.y += (p.y - d.y) * k;
          d.t += dt;
          if (d.t > 3.2 + (d.seed % 2.4)) {
            d.state = 'fading';
            d.t = 0;
          }
        } else if (d.state === 'fading') {
          d.alpha -= dt / 1.3;
          if (d.slot >= 0 && d.alpha < 0.9) {
            slots[d.fate][d.slot] = false;
            d.slot = -1;
          }
        } else {
          d.alpha -= dt / 0.6;
          d.x = endX;
        }
        if (d.alpha <= 0 && d.state !== 'flow') dots.splice(i, 1);
      }
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const on = activeRef.current;

      // The path, a little fainter after each gate: less of the demand is still with it.
      ctx.lineWidth = 1;
      const marks = [startX, ...gateX, endX];
      for (let s = 0; s < marks.length - 1; s++) {
        ctx.strokeStyle = `rgba(${NAVY},${Math.max(0.1, 0.3 - s * 0.07).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(marks[s], yMid);
        ctx.lineTo(marks[s + 1], yMid);
        ctx.stroke();
      }

      // Where it starts, and where it should end.
      ctx.beginPath();
      ctx.arc(startX, yMid, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(230,226,218,1)';
      ctx.fill();
      ctx.strokeStyle = `rgba(${NAVY},0.7)`;
      ctx.stroke();
      if (endPulse > 0.01) {
        ctx.beginPath();
        ctx.arc(endX, yMid, 7 + (1 - endPulse) * 14, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${ORANGE},${(endPulse * 0.5).toFixed(3)})`;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(endX, yMid, 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(230,226,218,1)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(${ORANGE},1)`;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(endX, yMid, 2.6 + endPulse * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ORANGE},1)`;
      ctx.fill();

      // The gates.
      for (let g = 0; g < n; g++) {
        const x = gateX[g];
        const lit = on === g;
        const half = 19 + (lit ? 4 : 0) + gatePulse[g] * 3;
        if (lit) {
          const halo = ctx.createRadialGradient(x, yMid, 0, x, yMid, 46);
          halo.addColorStop(0, `rgba(${ORANGE},0.16)`);
          halo.addColorStop(1, `rgba(${ORANGE},0)`);
          ctx.fillStyle = halo;
          ctx.fillRect(x - 46, yMid - 46, 92, 92);
        }
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = lit ? `rgba(${ORANGE},1)` : `rgba(${NAVY},${(0.78 + gatePulse[g] * 0.2).toFixed(2)})`;
        for (const dx of [-3.5, 3.5]) {
          ctx.beginPath();
          ctx.moveTo(x + dx, yMid - half);
          ctx.lineTo(x + dx, yMid + half);
          ctx.stroke();
        }
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 7, yMid - half);
        ctx.lineTo(x + 7, yMid - half);
        ctx.moveTo(x - 7, yMid + half);
        ctx.lineTo(x + 7, yMid + half);
        ctx.stroke();
      }

      // Inquiries: navy while moving, stone once they are stuck.
      for (const d of dots) {
        const a = Math.max(0, Math.min(1, d.alpha));
        let c = NAVY;
        let boost = 0.85;
        if (d.state === 'stalled' || d.state === 'fading') {
          c = STONE;
          boost = on === d.fate ? 1 : 0.75;
          if (d.state === 'stalled') {
            // They grey over the first moments rather than switching.
            const grey = Math.min(1, d.t / 0.8);
            const r = Math.round(13 + (168 - 13) * grey);
            const gr = Math.round(31 + (164 - 31) * grey);
            const b = Math.round(78 + (154 - 78) * grey);
            c = `${r},${gr},${b}`;
          }
        } else if (d.state === 'arrived') {
          c = ORANGE;
          boost = 1;
        }
        ctx.beginPath();
        ctx.arc(d.x, d.y, 2.9, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c},${(a * boost).toFixed(3)})`;
        ctx.fill();
      }
    };
    redrawRef.current = draw;

    const layout = () => {
      W = Math.max(1, canvas.clientWidth);
      H = Math.max(1, canvas.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      yMid = H * 0.54;
      startX = PAD;
      endX = W - PAD;
      gateX = gates.map((_, i) => startX + (endX - startX) * frac(i));
      speed = (endX - startX) / 11;
      rate = W < 560 ? 2 : 3;
      dots = [];
      slots.forEach((s) => s.fill(false));
      spawnAcc = 0;
      if (reduced) {
        // One composed frame: the scene as it looks after a few moments of running.
        for (let k = 0; k < 480; k++) step(1 / 30);
        draw();
      }
    };

    layout();
    const ro = new ResizeObserver(() => {
      layout();
      if (!reduced) draw();
    });
    ro.observe(canvas);

    let raf = 0;
    let last = 0;
    let visible = true;
    const frame = (ts: number) => {
      raf = 0;
      const dt = Math.min(0.05, last ? (ts - last) / 1000 : 1 / 60);
      last = ts;
      step(dt);
      draw();
      schedule();
    };
    const schedule = () => {
      if (!raf && !reduced && visible && !document.hidden) raf = requestAnimationFrame(frame);
      else if (!raf) last = 0;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      schedule();
    });
    io.observe(canvas);
    const onVis = () => schedule();
    document.addEventListener('visibilitychange', onVis);
    if (!reduced) schedule();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      redrawRef.current = () => {};
    };
    // The geometry depends only on how many gates there are.
  }, [n]);

  const at = (i: number) => `calc(${PAD}px + (100% - ${PAD * 2}px) * ${frac(i)})`;

  return (
    <div className="select-none">
      <canvas ref={canvasRef} aria-hidden="true" className="block h-[128px] w-full sm:h-[150px]" />
      <div aria-hidden="true" className="relative h-10 text-[13px] leading-tight text-ca-granite">
        <span className="absolute left-0 top-0">{start}</span>
        <span className="absolute right-0 top-0 text-right text-ca-rust">{end}</span>
        {gates.map((gate, i) => (
          <span
            key={gate}
            onMouseEnter={() => onActive(i)}
            onMouseLeave={() => onActive(null)}
            className={`absolute top-0 hidden -translate-x-1/2 whitespace-nowrap px-1 transition-colors duration-300 motion-reduce:transition-none md:block ${
              active === i ? 'font-medium text-ca-rust' : ''
            }`}
            style={{ left: at(i) }}
          >
            {gate}
          </span>
        ))}
      </div>
    </div>
  );
};
