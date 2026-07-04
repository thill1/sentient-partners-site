import React, { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { openBookingModal, openSentientChat, scrollToSection } from '../lib/siteActions';

/**
 * Voice navigation — hold the mic, say where you want to go.
 * "Show me pricing" scrolls. "Book a call" opens booking.
 * Anything else becomes a question for the Concierge.
 */

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface Intent {
  label: string;
  run: () => void;
}

function resolveIntent(raw: string): Intent {
  const t = raw.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));

  if (has('book', 'appointment', 'strategy call', 'schedule', 'meeting'))
    return { label: 'Booking a call', run: () => openBookingModal({ source: 'Voice Command', ctaLabel: 'Voice' }) };
  if (has('pricing', 'price', 'cost', 'how much', 'plans'))
    return { label: 'Pricing', run: () => scrollToSection('pricing') };
  if (has('demo', 'simulation', 'front desk', 'hear it'))
    return { label: 'Demo', run: () => scrollToSection('demo') };
  if (has('blueprint', 'estimate', 'calculator', 'my numbers', 'diagnosis'))
    return { label: 'Blueprint Engine', run: () => scrollToSection('diagnosis') };
  if (has('service', 'what do you do', 'offer'))
    return { label: 'Services', run: () => scrollToSection('services') };
  if (has('process', 'how it works', 'how you work'))
    return { label: 'Process', run: () => scrollToSection('process') };
  if (has('result', 'testimonial', 'proof', 'review'))
    return { label: 'Results', run: () => scrollToSection('testimonials') };
  if (has('faq', 'frequently'))
    return { label: 'FAQ', run: () => scrollToSection('faq') };
  if (has('top', 'home', 'start over', 'beginning'))
    return { label: 'Top', run: () => window.scrollTo({ top: 0, behavior: 'smooth' }) };
  if (has('concierge', 'chat', 'agent', 'talk'))
    return { label: 'Concierge', run: () => openSentientChat({ source: 'Voice Command', ctaLabel: 'Voice' }) };

  return {
    label: 'Asking the Concierge',
    run: () => openSentientChat({ source: 'Voice Command', ctaLabel: 'Voice', prefill: raw }),
  };
}

export const VoiceCommand: React.FC = () => {
  const [supported] = useState<boolean>(() => typeof window !== 'undefined' && getSpeechRecognition() !== null);
  const [listening, setListening] = useState(false);
  const [display, setDisplay] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef('');
  const fadeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        void 0;
      }
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    };
  }, []);

  const flash = (text: string, ms = 1800) => {
    setDisplay(text);
    if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = window.setTimeout(() => setDisplay(''), ms);
  };

  const start = () => {
    if (listening) return;
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    try {
      const rec = new Ctor();
      recognitionRef.current = rec;
      transcriptRef.current = '';
      rec.lang = 'en-US';
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (event: SpeechRecognitionEvent) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        transcriptRef.current = text.trim();
        setDisplay(transcriptRef.current || 'Listening…');
      };
      rec.onerror = () => {
        setListening(false);
        flash('Voice unavailable');
      };
      rec.start();
      setListening(true);
      setDisplay('Listening…');
    } catch {
      flash('Voice unavailable');
    }
  };

  const stopAndRun = () => {
    if (!listening) return;
    setListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {
      void 0;
    }
    // Let the final result land before resolving
    window.setTimeout(() => {
      const heard = transcriptRef.current.trim();
      if (!heard) {
        flash('Didn\u2019t catch that');
        return;
      }
      const intent = resolveIntent(heard);
      flash(`\u2192 ${intent.label}`);
      intent.run();
    }, 250);
  };

  if (!supported) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40 flex items-center gap-3">
      <button
        type="button"
        aria-label="Hold to speak a command"
        title="Hold and speak — try \u201cshow me pricing\u201d"
        onPointerDown={(e) => {
          e.preventDefault();
          start();
        }}
        onPointerUp={stopAndRun}
        onPointerLeave={() => listening && stopAndRun()}
        onPointerCancel={() => listening && stopAndRun()}
        className={`relative flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 select-none ${
          listening
            ? 'border-white/40 bg-brand-900 text-white scale-110'
            : 'border-brand-900/20 bg-white/80 text-brand-900 hover:border-brand-900/50 dark:border-white/20 dark:bg-brand-950/80 dark:text-white dark:hover:border-white/50'
        }`}
        style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
      >
        <Mic className="h-5 w-5" />
        {listening && (
          <span aria-hidden="true" className="absolute inset-0 rounded-full border border-white/50 animate-ping" />
        )}
      </button>

      {display && (
        <div
          role="status"
          className="max-w-[240px] truncate rounded-full border border-brand-900/15 bg-white/90 px-4 py-2 text-xs text-brand-950 backdrop-blur-md dark:border-white/15 dark:bg-brand-950/90 dark:text-white"
        >
          {display}
        </div>
      )}
    </div>
  );
};
