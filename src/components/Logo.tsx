import React from 'react';
import spLogo from '../assets/sp-logo-teal.png';

type LogoProps = {
  className?: string;
};

export const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={spLogo}
        alt="Sentient Partners"
        // HARD SIZE: adjust these two numbers to taste
        style={{ width: '60px', height: '60px' }}
        className="rounded-full object-contain shadow-md shadow-cyan-500/30"
      />
      <div className="flex flex-col leading-tight">
        <span className="text-base md:text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Sentient Partners
        </span>
        <span className="text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-cyan-400">
          AI · Automations · Always-On Revenue
        </span>
      </div>
    </div>
  );
};
