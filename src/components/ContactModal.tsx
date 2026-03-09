import React, { useState, useEffect } from 'react';
import { X, Send, Loader2, CheckCircle, Mail } from 'lucide-react';
import { dispatchToast, submitLead } from '../services/geminiService';
import { Button } from './Button';
import {
  CONTACT_MODAL_EVENT,
  type ContactModalPrefill,
} from '../lib/siteActions';

export const ContactModal: React.FC = () => {
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-fade-in"
        onClick={() => setIsOpen(false)}
      />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden animate-slide-up ring-1 ring-white/10">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
           <div>
             <h3 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
               <Mail className="w-5 h-5 text-brand-500" />
               Contact Us
             </h3>
             <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">We typically reply within 2 hours.</p>
           </div>
           <button 
             onClick={() => setIsOpen(false)} 
             className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-slate-400"
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
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Message Sent!</h4>
              <p className="text-slate-600 dark:text-slate-400">
                Thank you, {formData.name}. We'll be in touch shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-xl bg-brand-50 text-brand-700 border border-brand-100 px-4 py-3 text-sm dark:bg-brand-950/30 dark:text-brand-200 dark:border-brand-900/50">
                {meta.intent === 'blueprint'
                  ? 'We will review your goals and follow up with a tailored AI blueprint.'
                  : 'Tell us what you need help with and we will respond with next steps.'}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all dark:text-white"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all dark:text-white"
                  placeholder="john@company.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">How can we help?</label>
                <textarea 
                  required
                  value={formData.inquiry}
                  onChange={e => setFormData({...formData, inquiry: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all dark:text-white resize-none"
                  placeholder="Tell us about your automation needs..."
                />
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full py-4 text-base"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <Loader2 className="animate-spin mr-2" size={18} /> Sending...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Send Message <Send className="ml-2" size={16} />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};