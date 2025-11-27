import React, { useState } from 'react';
import { FAQS } from '../constants';
import { Plus, Minus } from 'lucide-react';

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Common Questions
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            Everything you need to know about automating your business.
          </p>
        </div>

        {/* FAQ items as floating glass cards */}
        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="rounded-2xl overflow-hidden border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl transition-all duration-300 hover:border-brand-500/60"
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                  onClick={() =>
                    setOpenIndex(isOpen ? null : index)
                  }
                >
                  <span className="font-semibold text-slate-900 dark:text-white pr-8">
                    {faq.question}
                  </span>
                  {isOpen ? (
                    <Minus className="w-5 h-5 text-brand-600 shrink-0" />
                  ) : (
                    <Plus className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen
                      ? 'max-h-48 sm:max-h-60 opacity-100'
                      : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-6 pb-5 pt-0 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/70 dark:border-white/10">
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
