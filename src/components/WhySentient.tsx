import React from 'react';
import { Target, LineChart, Workflow, ShieldCheck } from 'lucide-react';

export const WhySentient: React.FC = () => {
  return (
    <section
      id="why"
      className="relative py-20 sm:py-24 px-4 sm:px-6 lg:px-8"
      aria-labelledby="why-heading"
    >
      <div className="relative mx-auto max-w-6xl">
        {/* Local glow behind the Why Sentient card (does NOT block beams) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-900/60 to-transparent dark:from-slate-900/80" />
          <div className="absolute -right-32 top-1/3 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-cyan-500/25 blur-3xl" />
        </div>

        {/* Floating glass panel containing heading + cards */}
        <div className="rounded-3xl bg-white/6 dark:bg-slate-950/75 border border-white/10 backdrop-blur-xl shadow-[0_24px_70px_rgba(15,23,42,0.85)] p-8 sm:p-10">
          {/* Centered heading block */}
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-300">
              Why Sentient Partners
            </p>
            <h2
              id="why-heading"
              className="mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white"
            >
              Operators first. Systems obsessed. Built to ship, not just talk.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Sentient Partners is an AI implementation studio focused on small and
              mid-sized businesses. The same mindset used in enterprise environments
              is now pointed at building you unfair advantages in voice, chat,
              funnels, and follow-up.
            </p>
          </div>

          {/* Cards row */}
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="glass-panel flex flex-col rounded-2xl border border-white/10 bg-white/10 dark:bg-white/5

