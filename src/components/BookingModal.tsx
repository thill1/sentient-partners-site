import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import Cal, { getCalApi } from '@calcom/embed-react';
import { BOOKING_URL } from '../constants';
import { CA_CTA } from '../content/californiaContent';
import { BOOKING_MODAL_EVENT, openContactModal, type CtaEventDetail } from '../lib/siteActions';
import { keepDialogFocus } from '../lib/dialogFocus';

interface BookingModalProps {
  variant?: 'default' | 'concept';
}

export const BookingModal: React.FC<BookingModalProps> = ({ variant = 'default' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [iframeLoading, setIframeLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(BOOKING_URL);
  const [detail, setDetail] = useState<CtaEventDetail>({});
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const concept = variant === 'concept';
  const title = concept ? CA_CTA.primary : 'Schedule Discovery Call';
  const callName = concept ? 'introductory call' : 'strategy call';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const next = (event as CustomEvent<CtaEventDetail & { url?: string }>).detail ?? {};
      setDetail(next);
      setCurrentUrl(next.url || BOOKING_URL);
      setStatus('loading');
      setIframeLoading(true);
      setIsOpen(true);
    };
    window.addEventListener(BOOKING_MODAL_EVENT, handleOpen);
    return () => window.removeEventListener(BOOKING_MODAL_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    const previousOverflow = document.body.style.overflow;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      // Native modal focus containment also makes the page behind it inert.
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [isOpen, mounted]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const checkBookingUrl = async () => {
      try {
        const response = await fetch('/api/booking', { signal: controller.signal });
        if (!response.ok) throw new Error('Calendar unavailable');
        const data = (await response.json()) as { bookingAvailable?: boolean; bookingUrl?: string };
        if (controller.signal.aborted) return;
        if (data.bookingUrl) setCurrentUrl(data.bookingUrl);
        setStatus(data.bookingAvailable ? 'ready' : 'unavailable');
      } catch {
        if (!controller.signal.aborted) setStatus('unavailable');
      }
    };
    void checkBookingUrl();
    return () => controller.abort();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || status !== 'ready' || !iframeLoading) return;
    const timeout = window.setTimeout(() => setStatus('unavailable'), 20000);
    return () => window.clearTimeout(timeout);
  }, [isOpen, status, iframeLoading]);

  useEffect(() => {
    if (!isOpen || status !== 'ready') return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void getCalApi({ namespace: 'sentient-introductory' }).then((cal) => {
      if (cancelled) return;
      const ready = () => setIframeLoading(false);
      const failed = () => setStatus('unavailable');
      cal('on', { action: 'linkReady', callback: ready });
      cal('on', { action: 'linkFailed', callback: failed });
      cal('ui', {
        cssVarsPerTheme: {
          light: { 'cal-brand': concept ? '#0D1F4E' : '#292929' },
          dark: { 'cal-brand': '#F7F5F0' },
        },
        hideEventTypeDetails: false,
        layout: 'month_view',
      });
      unsubscribe = () => {
        cal('off', { action: 'linkReady', callback: ready });
        cal('off', { action: 'linkFailed', callback: failed });
      };
    }).catch(() => { if (!cancelled) setStatus('unavailable'); });
    return () => { cancelled = true; unsubscribe?.(); };
  }, [isOpen, status, concept]);

  if (!mounted || !isOpen) return null;

  const loading = status === 'loading' || (status === 'ready' && iframeLoading);
  const buttonClass = concept
    ? 'rounded-[2px] bg-ca-navy text-ca-ivory hover:bg-ca-deep focus-visible:outline-ca-navy'
    : 'rounded-full bg-brand-600 text-white hover:bg-brand-500 focus-visible:outline-brand-600';
  const calendarPath = new URL(currentUrl).pathname.replace(/^\//, '');

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="booking-dialog-title"
      aria-describedby={concept ? 'booking-dialog-description' : undefined}
      data-booking-variant={variant}
      onCancel={() => setIsOpen(false)}
      onClose={() => setIsOpen(false)}
      onKeyDown={(event) => keepDialogFocus(event.currentTarget, event)}
      className={`fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none border-0 bg-transparent p-0 backdrop:bg-slate-950/80 ${concept ? 'ca-root font-sans text-ca-navy' : ''}`}
    >
      <div
        className="flex h-full items-center justify-center p-3 sm:p-6"
        onClick={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}
      >
        <div className={`relative flex h-[90dvh] max-h-[960px] w-full max-w-6xl flex-col overflow-hidden ${concept ? 'rounded-[2px] bg-ca-ivory' : 'rounded-2xl bg-white dark:bg-dark-card'}`}>
          <div className={`flex shrink-0 items-start justify-between gap-4 border-b p-5 sm:px-7 ${concept ? 'border-ca-navy/15' : 'border-slate-200 dark:border-white/10'}`}>
            <div>
              <h2 id="booking-dialog-title" className={concept ? 'font-display text-[26px] leading-tight' : 'text-lg font-bold text-slate-900 dark:text-white'}>{title}</h2>
              {concept && <p id="booking-dialog-description" className="mt-2 max-w-[38rem] text-[14px] leading-relaxed text-ca-navy/80">{CA_CTA.callDescription}</p>}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close booking"
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center focus-visible:outline focus-visible:outline-2 ${concept ? 'rounded-sm hover:bg-ca-navy/5 focus-visible:outline-ca-navy' : 'rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'}`}
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          <div className="relative min-h-0 flex-1 overflow-y-auto bg-white">
            {loading && (
              <div role="status" className={`absolute inset-0 z-10 flex items-center justify-center ${concept ? 'bg-ca-ivory text-ca-navy' : 'bg-slate-50 text-slate-600 dark:bg-dark-card dark:text-slate-300'}`}>
                <div className="flex flex-col items-center gap-4">
                  <Loader2 aria-hidden="true" className="h-7 w-7 animate-spin motion-reduce:animate-none" />
                  <p className="text-sm">Loading the calendar…</p>
                </div>
              </div>
            )}
            {status === 'unavailable' && (
              <div className={`flex h-full items-center justify-center px-6 py-10 sm:px-10 ${concept ? 'bg-ca-ivory text-ca-navy' : 'bg-slate-50 text-slate-900 dark:bg-dark-card dark:text-white'}`}>
                <div className="max-w-lg text-center">
                  <h3 className={concept ? 'font-display text-[28px] leading-tight' : 'text-2xl font-bold'}>{concept ? 'Request an introductory call instead' : 'Request a strategy call instead'}</h3>
                  <p className={`mt-4 text-[15px] leading-relaxed ${concept ? 'text-ca-navy/80' : 'text-slate-600 dark:text-slate-300'}`}>
                    We couldn’t load the calendar here. Open it directly, or leave your details and we will reach out to schedule your {callName}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      openContactModal({
                        intent: 'contact',
                        source: `${detail.source || 'Booking Modal'} · Calendar fallback`,
                        ctaLabel: `Request ${callName}`,
                        inquiry: `I would like to schedule a Sentient Partners ${callName}.${detail.context ? ` I’m interested in: ${detail.context}.` : ''}`,
                      });
                    }}
                    className={`mt-6 inline-flex min-h-[48px] items-center justify-center px-6 py-3 text-[15px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${buttonClass}`}
                  >
                    Request {concept ? 'an introductory call' : 'a strategy call'}
                  </button>
                </div>
              </div>
            )}
            {status === 'ready' && (
              <Cal
                namespace="sentient-introductory"
                calLink={calendarPath}
                style={{ width: '100%', height: '100%', overflow: 'auto' }}
                config={{ theme: 'light', layout: 'month_view', useSlotsViewOnSmallScreen: 'true', showTimezoneWhenEventDetailsHidden: 'true' }}
              />
            )}
          </div>
          <div className={`shrink-0 border-t px-5 py-3 text-center text-[13px] ${concept ? 'border-ca-navy/15 text-ca-navy/80' : 'border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300'}`}>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-8 items-center underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Open calendar in a new tab
            </a>
          </div>
        </div>
      </div>
    </dialog>,
    document.body,
  );
};
