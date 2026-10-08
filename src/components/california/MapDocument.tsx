import React from 'react';
import spMonogramNavy from '../../assets/sp-monogram-navy.png';

interface MapDocumentProps {
  /** The map's sections, in order, as the drafted map names them. */
  sections: readonly string[];
  title: string;
  subtitle: string;
}

/**
 * The deliverable, sketched: two sheets of the Opportunity Map, the front one
 * showing its real sections as a reader would meet them. The ruled lines stand
 * for text and carry no findings: it shows what the document is made of, not
 * what any business's map says.
 */
export const MapDocument: React.FC<MapDocumentProps> = ({ sections, title, subtitle }) => (
  <div aria-hidden="true" className="relative mx-auto w-full max-w-[360px] pb-3 lg:mx-0 lg:ml-auto">
    <div className="absolute inset-x-3 top-3 h-full origin-bottom-left rotate-[2.4deg] border border-ca-navy/10 bg-[#F1EEE7]" />
    <div className="absolute inset-x-1.5 top-1.5 h-full origin-bottom-left rotate-[1deg] border border-ca-navy/10 bg-[#F6F3EC]" />
    <div className="relative border border-ca-navy/15 bg-[#FBFAF7] px-6 pb-7 pt-6 shadow-[0_34px_50px_-34px_rgba(13,31,78,0.4)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-[19px] leading-tight">{title}</p>
          <p className="mt-1 text-[12px] text-ca-granite">{subtitle}</p>
        </div>
        <img src={spMonogramNavy} alt="" className="h-7 w-7 shrink-0 object-contain opacity-80" />
      </div>
      <div className="mt-5 border-t border-ca-navy/15" />
      <div className="mt-5 space-y-5">
        {sections.map((name) => (
          <div key={name}>
            <p className="flex items-center gap-2.5 font-display text-[15px] leading-tight">
              <span className="block h-[7px] w-[7px] shrink-0 bg-ca-orange" />
              {name}
            </p>
            <div className="mt-2.5 space-y-[6px] pl-[17px]">
              <span className="block h-[3px] w-full bg-ca-navy/[0.09]" />
              <span className="block h-[3px] w-[90%] bg-ca-navy/[0.09]" />
              <span className="block h-[3px] w-[58%] bg-ca-navy/[0.09]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
