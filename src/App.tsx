import React from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Services } from './components/Services';
import { DemoSection } from './components/DemoSection';
import { Testimonials } from './components/Testimonials';
import { Pricing } from './components/Pricing';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';
import { CTASection } from './components/CTASection';
import { Process } from './components/Process';
import { ChatInterface } from './components/ChatInterface';
import { BookingModal } from './components/BookingModal';
import { ContactModal } from './components/ContactModal';
import { Toast } from './components/Toast';

function App() {
  return (
    <div className="min-h-screen selection:bg-brand-500 selection:text-white font-sans relative">
      {/* Skip link for keyboard + screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-full focus:bg-slate-900 focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      <Header />

      {/* Padding-top to clear the (likely fixed) header/navigation */}
      <main id="main-content" className="pt-20 md:pt-24">
        {/* 1. Hero: your existing animated hero + FAB */}
        <Hero />

        {/* 2. Demo: bring the “see it in action” section up high */}
        <DemoSection />

        {/* 3. Services: what they actually get */}
        <Services />

        {/* 4. Process: how implementation works */}
        <Process />

        {/* 5. Testimonials: social proof before pricing */}
        <Testimonials />

        {/* 6. Pricing: packages / offers */}
        <Pricing />

        {/* 7. FAQ: handle objections */}
        <FAQ />

        {/* 8. Final CTA: last push to book a demo */}
        <CTASection />
      </main>

      <Footer />

      {/* Global overlays / modals that sit above the page */}
      <ChatInterface />
      <BookingModal />
      <ContactModal />
      <Toast />
    </div>
  );
}

export default App;
