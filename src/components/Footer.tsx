import React from 'react';
import { Logo } from './Logo';
import { FOOTER_CONTENT } from '../content/siteContent';
import {
  openBookingModal,
  openContactModal,
  scrollToSection,
} from '../lib/siteActions';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-slate-200/40 dark:border-white/10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          {/* Left: Logo + tagline */}
          <div className="flex flex-col items-center md:items-start gap-4 text-center md:text-left">
            <Logo />
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              {FOOTER_CONTENT.tagline}
            </p>
          </div>

          {/* Middle: Quick links */}
          <div className="flex flex-wrap justify-center md:justify-end gap-6 text-sm">
            <div className="space-y-2 min-w-[120px] text-center md:text-left">
              <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wide">
                Navigate
              </p>
              <button
                type="button"
                onClick={() => scrollToSection('services')}
                className="block text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                Services
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('process')}
                className="block text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                Process
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('faq')}
                className="block text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                FAQ
              </button>
            </div>

            <div className="space-y-2 min-w-[160px] text-center md:text-left">
              <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wide">
                Get in touch
              </p>
              <button
                type="button"
                onClick={() =>
                  openBookingModal({
                    source: 'Footer',
                    ctaLabel: 'Book Strategy Call',
                  })
                }
                className="block text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                Book Strategy Call
              </button>
              <button
                type="button"
                onClick={() =>
                  openContactModal({
                    intent: 'contact',
                    source: 'Footer',
                    ctaLabel: 'Contact Sentient Partners',
                  })
                }
                className="block text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                Contact Sentient Partners
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-slate-200/40 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p className="text-center md:text-left">
            © {year} Sentient Partners. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-default">
              {FOOTER_CONTENT.footerLabel}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
export { Footer };
