import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SERVICES } from '../constants';
import { CheckCircle2, ArrowRight, Zap, X, Calendar, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { ServiceItem } from '../types';

const ServiceModal: React.FC<{ service: ServiceItem; onClose: () => void }> = ({ service, onClose }) => {
  const handleBook = () => {
    window.dispatchEvent(new CustomEvent('open-booking-modal'));
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-4 overflow-y-auto pointer-events-auto">
      <div
        className="fixed inset-0 bg-slate-900/90 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl bg-white dark:bg-dark-card md:rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col md:flex-row min-h-[90vh] md:min-h-[600px] md:h-auto h-full z-10 my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 text-slate-900 dark:text-white rounded-full backdrop-blur-sm transition-colors border border-transparent dark:border-white/10 shadow-lg"
        >
          <X size={24} />
        </button>

        <div className="w-full md:w-2/5 bg-slate-900 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 to-purple-600/20" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-8 border border-white/10 text-brand-400">
              <service.icon size={28} />
            </div>

            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 leading-tight">
              {service.title}
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              {service.description}
            </p>
          </div>

          <div className="relative z-10 mt-12 md:mt-0">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
              <h4 className="text-sm font-bold uppercase tracking-widest text-brand-400 mb-3 flex items-center">
                <Zap size={14} className="mr-2" />
                Primary Use Case
              </h4>
              <p className="text-slate-200 leading-relaxed">
                {service.details.useCase}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full md:w-3/5 p-8 md:p-12 bg-white dark:bg-dark-card overflow-y-auto">
          <div className="max-w-xl mx-auto md:max-w-none">
            <div className="mb-10">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {service.details.heading}
              </h3>
              <div className="h-1 w-20 bg-brand-500 rounded-full" />
            </div>

            <div className="space-y-8 mb-12">
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">
                  Key Features
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {service.features.map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-center p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5"
                    >
                      <CheckCircle2 className="w-5 h-5 text-brand-500 mr-3 shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">
                  Strategic Benefits
                </h4>
                <ul className="space-y-4">
                  {service.details.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 shrink-0" />
                      <span className="text-slate-600 dark:text-slate-300">
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-100 dark:border-white/10">
              <Button
                size="lg"
                onClick={handleBook}
                className="w-full sm:w-auto shadow-xl shadow-brand-500/20"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Book Strategy Call
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Close Details
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export const Services: React.FC = () => {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  useEffect(() => {
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.id) {
        setSelectedServiceId(customEvent.detail.id);
      }
    };
