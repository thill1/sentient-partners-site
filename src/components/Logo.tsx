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
        style={{ width: '90px', height: '90px' }}
        className="rounded-full object-contain shadow-md shadow-cyan-500/30"
      />
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
