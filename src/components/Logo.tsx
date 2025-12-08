import React from 'react';
import spLogo from '../assets/sp-logo-teal.png';

type LogoProps = {
  className?: string;
};

export const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  // HARD SIZE: adjust these two numbers to taste
  const SIZE = 90; // logo diameter (px)
  const GAP = 6; // how far outside the logo the orbit sits (px)
  const DOT = 6; // dot diameter (px)
  const SPEED = '2.8s'; // orbit speed

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo + Orbit */}
      <div
        className="relative inline-block"
        style={{ width: `${SIZE}px`, height: `${SIZE}px` }}
      >
        <img
          src={spLogo}
          alt="Sentient Partners"
          style={{ width: `${SIZE}px`, height: `${SIZE}px` }}
          className="rounded-full object-contain shadow-md shadow-cyan-500/30"
        />

        {/* Orbit overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full motion-reduce:animate-none animate-spin"
          style={{
            inset: `-${GAP}px`,
            animationDuration: SPEED,
          }}
        >
          {/* 1px ring */}
          <div
            className="absolute inset-0 rounded-full border"
            style={{
              borderWidth: '1px',
              borderColor: 'rgba(56, 189, 248, 0.35)',
              boxShadow: '0 0 0 1px rgba(56, 189, 248, 0.08)',
            }}
          />

          {/* Blue dot riding the ring */}
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: `${DOT}px`,
              height: `${DOT}px`,
              background: 'rgb(56, 189, 248)',
              boxShadow:
                '0 0 10px rgba(56, 189, 248, 0.95), 0 0 22px rgba(56, 189, 248, 0.45)',
            }}
          />
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col leading-tight">
        {/* Main brand text */}
        <span
          className="font-medium tracking-tight text-slate-900 dark:text-slate-50 text-[18px] md:text-[20px]"
          style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif' }}
        >
          Sentient Partners
        </span>
        <span className="hidden md:inline text-[11px] tracking-[0.16em] uppercase text-slate-400">
          AI · Automations · Always-On Revenue
        </span>
      </div>
    </div>
  );
};
