import React from 'react';
import { PlayCircle } from 'lucide-react';
import { Button } from './Button';

export const DemoSection: React.FC = () => {
  const openBooking = () => {
    window.dispatchEvent(new CustomEvent('open-booking-modal'));
  };

  return (
    <section
      id="demo"
      className="py-20 sm:py-24 bg-slate-50 dark:bg-slate-950"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-10 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 dark:text-white">
            See the Agent in Action
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Watch a live AI agent handle inbound calls, qualify leads, and book appointments
            without you lifting a finger.
          </p>
        </div>

        {/* Demo card with rounded corners */}
        <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xl overflow-hidden dark:border-slate-800/80 dark:bg-slate-900/80">
          {/* Video / iframe placeholder */}
          <div className="aspect-video bg-slate-900/90 flex items-center justify-center relative">
            <button
              type="button"
              className="inline-flex items-center gap-3 rounded-full bg-white/95 px-5 py-2.5 text-sm font-medium text-slate-900 shadow-lg hover:bg-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              onClick={openBooking}
            >
              <PlayCircle className="h-5 w-5" />
              Watch Live Demo
            </button>

            {/* Optional subtle overlay label */}
            <span className="absolute bottom-4 right-4 text-[11px] uppercase tracking-[0.14em] text-slate-300/80">
              Sentient Voice · Live Agent
            </span>
          </div>

          {/* Card footer content */}
          <div className="px-6 py-5 sm:px-8 sm:py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl">
              We’ll walk through a real call flow, show you how bookings appear in your calendar,
              and answer questions about wiring this into your existing systems.
            </p>
            <div className="flex flex-wrap gap-3 justify-start sm:justify-end">
              <Button size="md" onClick={openBooking}>
                Book a Live Demo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
