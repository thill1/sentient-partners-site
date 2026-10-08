import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2, CheckCircle, Mail } from 'lucide-react';
import { dispatchToast, submitLead } from '../services/geminiService';
import { Button } from './Button';
import { keepDialogFocus } from '../lib/dialogFocus';
import {
  CONTACT_MODAL_EVENT,
  type ContactModalPrefill,
} from '../lib/siteActions';

export const ContactModal: React.FC<{ variant?: 'default' | 'concept' }> = ({ variant = 'default' }) => {
  const concept = variant === 'concept';
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [meta, setMeta] = useState<ContactModalPrefill>({
    intent: 'contact',
    source: 'Contact Modal',
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    inquiry: '',
  });

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<ContactModalPrefill>).detail || {};
      setIsOpen(true);
      setIsSuccess(false);
      setMeta({
        intent: detail.intent || 'contact',
        source: detail.source || 'Contact Modal',
        ctaLabel: detail.ctaLabel,
      });
      setFormData({
        name: detail.name || '',
        email: detail.email || '',
        inquiry: detail.inquiry || '',
      });
    };

    window.addEventListener(CONTACT_MODAL_EVENT, handleOpen);
    return () => window.removeEventListener(CONTACT_MODAL_EVENT, handleOpen);
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
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [isOpen]);

  const callRequest = concept && meta.ctaLabel === 'Request introductory call';
  const inputClass = concept
    ? 'w-full rounded-[2px] border border-ca-navy/25 bg-white px-4 py-3 text-ca-navy placeholder:text-ca-granite focus:outline focus:outline-2 focus:outline-ca-navy'
    : 'w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all dark:text-white';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.inquiry) return;

    setIsLoading(true);

    const result = await submitLead({
      name: formData.name,
      email: formData.email,
      inquiry: formData.inquiry,
      intent: meta.intent || 'contact',
      source: meta.source || 'Contact Modal',
      ctaLabel: meta.ctaLabel,
    });

    setIsLoading(false);

    if (result.success) {
      setIsSuccess(true);
      dispatchToast(result.message || 'Message sent successfully!', 'success');
      setTimeout(() => {
        setIsOpen(false);
      }, 2500);
    } else {
      dispatchToast(result.message || "Failed to send message", "error");
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="contact-dialog-title"
      onCancel={() => setIsOpen(false)}
      onClose={() => setIsOpen(false)}
      onKeyDown={(event) => keepDialogFocus(event.currentTarget, event)}
      className={`fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none border-0 bg-transparent p-0 backdrop:bg-slate-950/80 ${concept ? 'ca-root font-sans text-ca-navy' : ''}`}
    >
      <div className="flex h-full items-center justify-center p-4" onClick={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
      <div className={`relative max-h-[90dvh] w-full max-w-lg overflow-y-auto ${concept ? 'rounded-[2px] bg-ca-ivory' : 'bg-white dark:bg-dark-card rounded-2xl shadow-2xl animate-slide-up ring-1 ring-white/10'}`}>
        
        <div className={`flex items-start justify-between gap-4 border-b p-6 ${concept ? 'border-ca-navy/15' : 'border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5'}`}>
           <div>
             <h3 id="contact-dialog-title" className={concept ? 'font-display text-[26px] leading-tight' : 'font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2'}>
               {!concept && <Mail className="w-5 h-5 text-brand-500" />}
               {callRequest ? 'Request an introductory call' : concept ? 'Contact Sentient Partners' : 'Contact Us'}
             </h3>
             <p className={`mt-2 text-sm leading-relaxed ${concept ? 'text-ca-navy/80' : 'text-slate-500 dark:text-slate-400'}`}>{concept ? 'Leave your details and we’ll follow up with you.' : 'We typically reply within 2 hours.'}</p>
           </div>
           <button 
             onClick={() => setIsOpen(false)} 
             aria-label="Close contact form"
             type="button"
             className={`inline-flex h-11 w-11 shrink-0 items-center justify-center focus-visible:outline focus-visible:outline-2 ${concept ? 'rounded-sm text-ca-navy hover:bg-ca-navy/5 focus-visible:outline-ca-navy' : 'rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'}`}
           >
             <X className="w-5 h-5" />
           </button>
        </div>

        <div className="p-6 md:p-8">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={32} />
              </div>
              <h4 className={concept ? 'mb-2 font-display text-[26px] text-ca-navy' : 'text-xl font-bold text-slate-900 dark:text-white mb-2'}>{callRequest ? 'Call request received' : concept ? 'Message sent' : 'Message Sent!'}</h4>
              <p className={concept ? 'text-ca-navy/80' : 'text-slate-600 dark:text-slate-400'}>
                Thank you, {formData.name}. We'll be in touch shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className={concept ? 'text-[14px] leading-relaxed text-ca-navy/80' : 'rounded-xl bg-brand-50 text-brand-700 border border-brand-100 px-4 py-3 text-sm dark:bg-brand-950/30 dark:text-brand-200 dark:border-brand-900/50'}>
                {callRequest ? 'We’ll use these details to arrange an introductory conversation about your business.' : meta.intent === 'blueprint'
                  ? 'We will review your goals and follow up with a tailored AI blueprint.'
                  : 'Tell us what you need help with and we will respond with next steps.'}
              </div>
              <div>
                <label htmlFor="contact-name" className={`mb-1.5 block text-sm font-medium ${concept ? 'text-ca-navy' : 'text-slate-700 dark:text-slate-300'}`}>Full Name</label>
                <input 
                  id="contact-name"
                  autoComplete="name"
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className={inputClass}
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label htmlFor="contact-email" className={`mb-1.5 block text-sm font-medium ${concept ? 'text-ca-navy' : 'text-slate-700 dark:text-slate-300'}`}>Email Address</label>
                <input 
                  id="contact-email"
                  autoComplete="email"
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className={inputClass}
                  placeholder="john@company.com"
                />
              </div>
              
              <div>
                <label htmlFor="contact-inquiry" className={`mb-1.5 block text-sm font-medium ${concept ? 'text-ca-navy' : 'text-slate-700 dark:text-slate-300'}`}>How can we help?</label>
                <textarea
                  id="contact-inquiry"
                  required
                  value={formData.inquiry}
                  onChange={e => setFormData({...formData, inquiry: e.target.value})}
                  rows={4}
                  className={`${inputClass} resize-none`}
                  placeholder={concept ? 'Tell us about your business and where work gets stuck…' : 'Tell us about your automation needs...'}
                />
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className={`w-full py-4 text-base ${concept ? '!rounded-[2px] !bg-ca-navy !text-ca-ivory !shadow-none hover:!bg-ca-deep' : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <Loader2 className="animate-spin mr-2" size={18} /> Sending...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      {callRequest ? 'Request an introductory call' : concept ? 'Send message' : 'Send Message'} <Send aria-hidden="true" className="ml-2" size={16} />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
      </div>
    </dialog>,
    document.body,
  );
};
