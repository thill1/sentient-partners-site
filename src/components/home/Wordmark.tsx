import React from 'react';
import spMonogramNavy from '../../assets/sp-monogram-navy.png';
import spMonogramWhite from '../../assets/sp-monogram-white.png';

interface WordmarkProps {
  tone: 'light' | 'dark';
  className?: string;
}

/** The SP monogram with the Sentient Partners name set in letterspaced capitals. */
export const Wordmark: React.FC<WordmarkProps> = ({ tone, className = '' }) => (
  <span className={`inline-flex items-center gap-3 ${className}`}>
    <img
      src={tone === 'light' ? spMonogramWhite : spMonogramNavy}
      alt=""
      aria-hidden="true"
      width={513}
      height={835}
      className="h-10 w-auto lg:h-11"
    />
    <span
      className={`font-editorial text-[15px] uppercase leading-none tracking-[0.24em] sm:text-[17px] ${
        tone === 'light' ? 'text-sp-ivory' : 'text-sp-navy'
      }`}
    >
      Sentient <span className="max-[359px]:hidden">Partners</span>
    </span>
  </span>
);
