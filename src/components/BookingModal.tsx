import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { BOOKING_URL } from '../constants';
import { BOOKING_MODAL_EVENT, openContactModal } from '../lib/siteActions';

export const BookingModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(BOOKING_URL);
  const [bookingAvailable, setBookingAvailable] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const customEvent = event as CustomEvent;
      
      if (customEvent && customEvent.detail && customEvent.detail.url) {
        setCurrentUrl(customEvent.detail.url);
      } else {
        setCurrentUrl(BOOKING_URL);
      }
      
      setIsLoading(true);
      setBookingAvailable(true);
      setIsOpen(true);
    };

    window.addEventListener(BOOKING_MODAL_EVENT, handleOpen);

    return () => {
      window.removeEventListener(BOOKING_MODAL_EVENT, handleOpen);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const checkBookingUrl = async () => {
      if (!isOpen) return;

      try {
        const response = await fetch('/api/booking');
        const data = (await response.json()) as {
          bookingAvailable?: boolean;
          bookingUrl?: string;
        };

        setBookingAvailable(Boolean(data.bookingAvailable));
        if (data.bookingUrl) {
          setCurrentUrl(data.bookingUrl);
        }
      } catch {
        setBookingAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };

    void checkBookingUrl();
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6" 
      aria-modal="true" 
      role="dialog"
    >
      <div 
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm animate-fade-in" 
        onClick={() => setIsOpen(false)} 
        aria-hidden="true"
      />
      
      <div className="relative z-[99999] w-full max-w-5xl h-[85vh] sm:h-[90vh] bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in ring-1 ring-white/10">
        
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-dark-card shrink-0">
           <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400' : 'bg-green-500'} transition-colors duration-300`}></div>
             <h3 className="font-bold text-lg text-slate-900 dark:text-white">Schedule Discovery Call</h3>
           </div>
           <button 
             onClick={() => setIsOpen(false)} 
             className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-slate-400"
             aria-label="Close"
           >
             <X className="w-5 h-5" />
           </button>
        </div>

        <div className="flex-1 w-full relative bg-white overflow-hidden -webkit-overflow-scrolling-touch">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-dark-card z-10">
              <div className="flex flex-col items-center animate-fade-in">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
                <p className="text-sm text-slate-500 font-medium">Loading Calendar...</p>
              </div>
            </div>
          )}

          {!isLoading && !bookingAvailable ? (
            <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-dark-card px-8">
              <div className="max-w-lg text-center">
                <h4 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Request a strategy call instead
                </h4>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  The live calendar is temporarily unavailable. Leave your details and
                  we will reach out directly to schedule your strategy call.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    openContactModal({
                      intent: 'contact',
                      source: 'Booking Modal Fallback',
                      ctaLabel: 'Request Strategy Call',
                      inquiry:
                        'I would like to schedule a Sentient Partners strategy call.',
                    });
                  }}
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-500"
                >
                  Request Strategy Call
                </button>
              </div>
            </div>
          ) : (
            <iframe
              src={currentUrl}
              className="w-full h-full border-0 block"
              title="Cal.com Booking"
              allow="camera; microphone; autoplay; fullscreen"
              onLoad={() => setIsLoading(false)}
              style={{
                opacity: isLoading ? 0 : 1,
                transition: 'opacity 0.4s ease-in',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};