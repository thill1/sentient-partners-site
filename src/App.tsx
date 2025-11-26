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

      <main id="main-content">
        {/* 1. Hero: big promise + primary CTA */}
        <Hero />

        {/* 2. Demo early: show the magic quickly */}
        <DemoSection />

        {/* 3. Services: what they actually get */}
        <Services />

        {/* 4. Process: how it works / implementation steps */}
        <Process />

        {/* 5. Social proof before asking for money */}
        <Testimonials />

        {/* 6. Pricing: plans / offers */}
        <Pricing />

        {/* 7. FAQ: clear objections */}
        <FAQ />

        {/* 8. Final CTA: one last strong push to book */}
        <CTASection />
      </main>

      <Footer />

      {/* Global Overlays (portals / dialogs) */}
      <ChatInterface />
      <BookingModal />
      <ContactModal />
      <Toast />
    </div>
  );
}

export default App;
