import React, { useEffect, useState } from 'react';

interface SystemSchematicProps {
  /** The four layers, named, left to right. */
  stages: readonly string[];
  /** The last layer the reader has reached (-1 before the first). */
  reached: number;
}

const VB_W = 520;
const VB_H = 416;
const DECK = 268;
const TOP = 88;
const WATER = 332;
const SAG = 205; // the cable's lowest point, midway between two towers
const IVORY = '247,245,240';
const ORANGE = '224,82,47';

/** Where the towers stand, for any number of layers (four, here). */
const towerXs = (n: number) => {
  const gap = 124;
  const first = (VB_W - gap * (n - 1)) / 2;
  return Array.from({ length: n }, (_, i) => first + gap * i);
};

/**
 * The system as a bridge in elevation: one tower for each layer, one cable
 * carrying demand from the first to the last. Towers and spans light as the
 * reader reaches each layer, and a small signal travels the lit spans. It is
 * drawn the way the Bay Bridge is built, and it says nothing the list beside it
 * doesn't, so it stays out of the accessibility tree.
 */
export const SystemSchematic: React.FC<SystemSchematicProps> = ({ stages, reached }) => {
  const [still, setStill] = useState(false);
  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const n = stages.length;
  const xs = towerXs(n);
  const cy = TOP + 2 * (SAG - TOP);
  const span = (i: number) => `M ${xs[i]} ${TOP} Q ${(xs[i] + xs[i + 1]) / 2} ${cy} ${xs[i + 1]} ${TOP}`;
  const back = [
    `M ${xs[0]} ${TOP} Q ${xs[0] / 2} ${TOP + 88} 0 ${DECK - 32}`,
    `M ${xs[n - 1]} ${TOP} Q ${(xs[n - 1] + VB_W) / 2} ${TOP + 88} ${VB_W} ${DECK - 32}`,
  ];
  const lit = (i: number) => i <= reached;
  const spanLit = (i: number) => i + 1 <= reached;

  /** The cable's height above the deck at x, between tower i and the next. */
  const hangers = (i: number) => {
    const out: { x: number; y: number }[] = [];
    const w = xs[i + 1] - xs[i];
    for (let x = xs[i] + 9; x < xs[i + 1] - 4; x += 9) {
      const t = (x - xs[i]) / w;
      out.push({ x, y: TOP + 2 * (cy - TOP) * t * (1 - t) });
    }
    return out;
  };

  return (
    <div
      aria-hidden="true"
      className="relative aspect-[5/4] w-full overflow-hidden bg-ca-deep bg-[linear-gradient(rgba(247,245,240,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(247,245,240,0.04)_1px,transparent_1px)] bg-[size:32px_32px]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,rgba(140,90,154,0.28),rgba(6,12,28,0)_70%),linear-gradient(to_bottom,rgba(6,12,28,0)_55%,rgba(6,12,28,0.7)_100%)]" />

      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 h-full w-full" fill="none" strokeLinecap="round">
        <defs>
          <radialGradient id="ca-sys-glow">
            <stop offset="0" stopColor={`rgb(${ORANGE})`} stopOpacity="0.6" />
            <stop offset="1" stopColor={`rgb(${ORANGE})`} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Water: still lines, and each tower's reflection. */}
        {[WATER, WATER + 20, WATER + 40, WATER + 62].map((y, k) => (
          <line key={y} x1="0" x2={VB_W} y1={y} y2={y} stroke={`rgba(${IVORY},${[0.3, 0.12, 0.08, 0.05][k]})`} strokeDasharray={k ? '2 7' : undefined} />
        ))}
        {xs.map((x, i) => (
          <g key={`r${i}`} opacity={lit(i) ? 0.35 : 0.1} style={{ transition: 'opacity 900ms ease' }}>
            <line x1={x - 5} x2={x - 5} y1={WATER + 6} y2={WATER + 54} stroke={`rgb(${IVORY})`} strokeDasharray="3 5" />
            <line x1={x + 5} x2={x + 5} y1={WATER + 6} y2={WATER + 54} stroke={`rgb(${IVORY})`} strokeDasharray="3 5" />
          </g>
        ))}

        {/* The deck. */}
        <line x1="0" x2={VB_W} y1={DECK} y2={DECK} stroke={`rgba(${IVORY},0.85)`} strokeWidth="2" />
        <line x1="0" x2={VB_W} y1={DECK + 7} y2={DECK + 7} stroke={`rgba(${IVORY},0.3)`} />

        {/* Back stays, then the spans. The faint cable is always there; the lit one draws in. */}
        {back.map((d, k) => {
          const on = lit(k === 0 ? 0 : n - 1);
          return (
            <g key={`b${k}`}>
              <path d={d} stroke={`rgba(${IVORY},0.2)`} />
              <path
                d={d}
                pathLength={1}
                stroke={`rgba(${IVORY},0.9)`}
                strokeDasharray="1"
                strokeDashoffset={on ? 0 : 1}
                style={{ transition: 'stroke-dashoffset 1100ms cubic-bezier(0.2,0.7,0.2,1)' }}
              />
            </g>
          );
        })}
        {xs.slice(0, -1).map((_, i) => {
          const on = spanLit(i);
          return (
            <g key={`s${i}`}>
              {hangers(i).map((h, k) => (
                <line
                  key={k}
                  x1={h.x}
                  x2={h.x}
                  y1={h.y}
                  y2={DECK}
                  stroke={`rgba(${IVORY},${on ? 0.5 : 0.14})`}
                  style={{ transition: `stroke 700ms ease ${on ? 500 + k * 25 : 0}ms` }}
                />
              ))}
              <path d={span(i)} stroke={`rgba(${IVORY},0.2)`} />
              <path
                d={span(i)}
                pathLength={1}
                stroke={`rgba(${IVORY},0.95)`}
                strokeWidth="1.5"
                strokeDasharray="1"
                strokeDashoffset={on ? 0 : 1}
                style={{ transition: 'stroke-dashoffset 1300ms cubic-bezier(0.2,0.7,0.2,1)' }}
              />
              {on && !still && (
                <>
                  <circle r="10" fill="url(#ca-sys-glow)">
                    <animateMotion dur="3.8s" begin={`${i * 0.6}s`} repeatCount="indefinite" path={span(i)} calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.55 1" />
                    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="3.8s" begin={`${i * 0.6}s`} repeatCount="indefinite" />
                  </circle>
                  <circle r="2.8" fill={`rgb(${ORANGE})`}>
                    <animateMotion dur="3.8s" begin={`${i * 0.6}s`} repeatCount="indefinite" path={span(i)} calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.55 1" />
                    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="3.8s" begin={`${i * 0.6}s`} repeatCount="indefinite" />
                  </circle>
                </>
              )}
            </g>
          );
        })}

        {/* The towers: two legs, bracing, a cap, and a footing in the water. */}
        {xs.map((x, i) => {
          const on = lit(i);
          const stroke = `rgba(${IVORY},${on ? 0.95 : 0.34})`;
          const now = i === reached;
          return (
            <g key={`t${i}`} style={{ transition: 'opacity 700ms ease' }}>
              {now && (
                <>
                  <circle cx={x} cy={TOP} r="22" fill="url(#ca-sys-glow)" opacity="0.7" />
                  <rect x={x - 4} y={TOP - 4} width="8" height="8" fill={`rgb(${ORANGE})`} />
                </>
              )}
              <g stroke={stroke} strokeWidth="1.6" style={{ transition: 'stroke 700ms ease' }}>
                <line x1={x - 5} x2={x - 5} y1={TOP} y2={WATER} />
                <line x1={x + 5} x2={x + 5} y1={TOP} y2={WATER} />
                <line x1={x - 9} x2={x + 9} y1={TOP} y2={TOP} />
                <line x1={x - 5} x2={x + 5} y1={TOP + 28} y2={TOP + 28} />
                <line x1={x - 5} x2={x + 5} y1={TOP + 64} y2={TOP + 64} />
                <line x1={x - 5} x2={x + 5} y1={TOP + 104} y2={TOP + 104} />
                <line x1={x - 13} x2={x + 13} y1={WATER} y2={WATER} />
              </g>
            </g>
          );
        })}
      </svg>

      {/* The layer names stand above their towers, as signs do. */}
      {stages.map((name, i) => (
        <div
          key={name}
          className="absolute -translate-x-1/2 text-center"
          style={{ left: `${(xs[i] / VB_W) * 100}%`, top: `${((TOP - 62) / VB_H) * 100}%` }}
        >
          <p className={`font-mono text-[10px] tabular-nums transition-colors duration-700 ${i === reached ? 'text-[#F2784F]' : lit(i) ? 'text-ca-ivory/70' : 'text-ca-ivory/35'}`}>
            {String(i + 1).padStart(2, '0')}
          </p>
          <p className={`mt-0.5 font-display text-[14px] leading-none transition-colors duration-700 sm:text-[18px] ${lit(i) ? 'text-ca-ivory' : 'text-ca-ivory/45'}`}>{name}</p>
        </div>
      ))}
    </div>
  );
};
