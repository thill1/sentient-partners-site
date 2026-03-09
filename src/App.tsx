import React, { useEffect } from 'react';
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
import { WhySentient } from './components/WhySentient';


function App() {
  useEffect(() => {
    const root = document.documentElement;

    // Respect any saved theme; otherwise default to DARK (matches index.html)
    const saved =
      localStorage.getItem('theme') ||
      localStorage.getItem('color-theme') ||
      localStorage.getItem('sentient-theme');

    if (saved === 'dark' || !saved) {
      root.classList.add('dark');
      if (!saved) localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  return (
    <div className="min-h-screen selection:bg-brand-500 selection:text-white font-sans relative">
      <Header />

      <main id="main-content" className="pt-20 md:pt-24">
        <Hero />
        <DemoSection />
        <Services />
        <Process />
        <WhySentient />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTASection />
      </main>

      <Footer />

      <ChatInterface />
      <BookingModal />
      <ContactModal />
      <Toast />
    </div>
  );
}

export default App;
