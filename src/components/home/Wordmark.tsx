import React from 'react';
import spMonogramNavy from '../../assets/sp-monogram-navy.png';
import spMonogramWhite from '../../assets/sp-monogram-white.png';

interface WordmarkProps {
  tone: 'light' | 'dark';
  className?: string;
}

/** The SP monogram with the Sentient Partners name set in letterspaced capitals. */
export const Wordmark: React.FC<WordmarkProps> = ({ tone, className = '' }) => (
  <span className={`inline-flex items-center gap-3 max-[359px]:gap-2 ${className}`}>
    <img
      src={tone === 'light' ? spMonogramWhite : spMonogramNavy}
      alt=""
      aria-hidden="true"
      width={513}
      height={835}
      className="h-10 w-auto lg:h-11 max-[359px]:h-8"
    />
    <span
      className={`font-editorial text-[15px] uppercase leading-none tracking-[0.24em] sm:text-[17px] max-[359px]:text-[13px] max-[359px]:tracking-[0.1em] ${
        tone === 'light' ? 'text-sp-ivory' : 'text-sp-navy'
      }`}
    >
      Sentient Partners
    </span>
  </span>
);
