import React from 'react';
import spLogo from '../assets/sp-logo-teal.png';

type LogoSize = 'sm' | 'md' | 'lg';

type LogoProps = {
  className?: string;
  size?: LogoSize;
};

const sizeClasses: Record<LogoSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-24 w-24', // bigger for nav/footer
};

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const imageSize = sizeClasses[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={spLogo}
        alt="Sentient Partners"
        className={`${imageSize} rounded-full object-contain shadow-md shadow-cyan-500/30`}
      />
      <div className="flex flex-col leading-tight">
        <span className="text-sm md:text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Sentient Partners
        </span>
        <span className="text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-cyan-400">
          AI · Automations · Always-On Revenue
        </span>
      </div>
    </div>
  );
};
