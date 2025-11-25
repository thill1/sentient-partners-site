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
        className="h-9 w-9 rounded-full object-contain shadow-md shadow-cyan-500/30"
      />
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Sentient Partners
        </span>
        <span className="text-[11px] uppercase tracking-[0.18em] text-cyan-400">
          AI · Automations · Always-On Revenue
        </span>
      </div>
    </div>
  );
};
