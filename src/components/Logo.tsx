import React from 'react';
import spMonogramNavy from '../assets/sp-monogram-navy.png';
import spMonogramWhite from '../assets/sp-monogram-white.png';

type LogoProps = {
  className?: string;
  /** Hide the wordmark and show the monogram alone (e.g. tight mobile headers) */
  markOnly?: boolean;
};

/**
 * Official Sentient Partners lockup:
 * interlocked SP serif monogram | hairline divider | serif wordmark
 * with the "AI First Agency" tagline in letterspaced caps.
 * Brand navy: #0D1F4E
 */
export const Logo: React.FC<LogoProps> = ({ className = '', markOnly = false }) => {
  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      {/* SP monogram — navy on light, white on dark */}
      <div className="relative h-12 w-12 md:h-14 md:w-14 shrink-0">
        <img
          src={spMonogramNavy}
          alt="Sentient Partners"
          className="h-full w-full object-contain dark:hidden"
        />
        <img
          src={spMonogramWhite}
          alt=""
          aria-hidden="true"
          className="hidden h-full w-full object-contain dark:block"
        />
      </div>

      {!markOnly && (
        <>
          {/* Hairline divider */}
          <span
            aria-hidden="true"
            className="hidden sm:block h-9 md:h-10 w-px bg-brand-900/30 dark:bg-white/30"
          />

          {/* Wordmark + tagline */}
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-display font-semibold text-brand-900 dark:text-white text-[19px] md:text-[22px] tracking-tight">
              Sentient Partners
            </span>
            <span className="mt-1.5 flex items-center gap-2 text-[9px] md:text-[10px] tracking-brand uppercase text-brand-900/60 dark:text-white/55">
              <span aria-hidden="true" className="h-px w-4 bg-current opacity-50" />
              AI First Agency
              <span aria-hidden="true" className="h-px w-4 bg-current opacity-50" />
            </span>
          </div>
        </>
      )}
    </div>
  );
};
