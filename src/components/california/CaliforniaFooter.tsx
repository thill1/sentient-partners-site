import React from 'react';
import spMonogramWhite from '../../assets/sp-monogram-white.png';
import { CA_CTA, CA_FOOTER, CA_NAV } from '../../content/californiaContent';
import { openBookingModal, openContactModal, scrollToSection } from '../../lib/siteActions';

export const CaliforniaFooter: React.FC = () => {
  const linkClass =
    'rounded-sm text-left text-[14px] text-ca-ivory/65 transition-colors hover:text-ca-ivory focus:outline-none focus-visible:ring-2 focus-visible:ring-ca-orange';

  return (
    <footer data-ca-tone="dark" className="bg-ca-deep text-ca-ivory">
      {/* Extra bottom padding keeps the floating mic and Concierge clear of the links. */}
      <div className="mx-auto max-w-[1400px] px-5 pb-28 pt-16 sm:px-8 lg:px-12">
        <div className="grid gap-12 border-t border-ca-ivory/10 pt-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <img src={spMonogramWhite} alt="" className="h-10 w-10 object-contain" />
              <span className="font-display text-[20px] font-semibold tracking-tight">Sentient Partners</span>
            </div>
            <p className="mt-4 text-[14px] text-ca-ivory/65">{CA_FOOTER.line}</p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-3 md:col-span-4">
            {CA_NAV.map((item) => (
              <button key={item.id} type="button" onClick={() => scrollToSection(item.id)} className={linkClass}>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex flex-col items-start gap-3 md:col-span-3">
            <button
              type="button"
              onClick={() => openBookingModal({ source: 'California · Footer', ctaLabel: CA_CTA.primary })}
              className={linkClass}
            >
              {CA_CTA.primary}
            </button>
            <button
              type="button"
              onClick={() => openContactModal({ intent: 'contact', source: 'California · Footer', ctaLabel: 'Contact' })}
              className={linkClass}
            >
              Contact Sentient Partners
            </button>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 text-[12px] text-ca-ivory/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Sentient Partners. All rights reserved.</p>
          <p className="flex items-center gap-4">
            <span>{CA_FOOTER.conceptNote}</span>
            <a href="#/" className="underline decoration-ca-ivory/30 underline-offset-4 hover:text-ca-ivory">
              {CA_FOOTER.homeLink}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};
