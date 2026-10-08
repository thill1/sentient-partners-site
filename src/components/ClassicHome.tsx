import React from 'react';
import { HOME_SECTION_ORDER } from '../content/siteContent';
import type { BannerDisplayState } from '../types';
import { BlueprintEngine } from './BlueprintEngine';
import { BookingModal } from './BookingModal';
import { ChatInterface } from './ChatInterface';
import { ContactModal } from './ContactModal';
import { CTASection } from './CTASection';
import { DemoSection } from './DemoSection';
import { FAQ } from './FAQ';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { IntroSplash } from './IntroSplash';
import { Pricing } from './Pricing';
import { Process } from './Process';
import { Services } from './Services';
import { Testimonials } from './Testimonials';
import { Toast } from './Toast';
import { VoiceCommand } from './VoiceCommand';
import { WhySentient } from './WhySentient';

const SECTIONS: Record<(typeof HOME_SECTION_ORDER)[number], React.ReactNode> = {
  hero: <Hero key="hero" />,
  why: <WhySentient key="why" />,
  services: <Services key="services" />,
  demo: <DemoSection key="demo" />,
  diagnosis: <BlueprintEngine key="diagnosis" />,
  testimonials: <Testimonials key="testimonials" />,
  process: <Process key="process" />,
  pricing: <Pricing key="pricing" />,
  faq: <FAQ key="faq" />,
  cta: <CTASection key="cta" />,
};

/**
 * The previous homepage, unchanged, at /#/classic: intro splash, promo banner,
 * Blueprint Engine, front-desk demo, Voice Command and the rest.
 */
export const ClassicHome: React.FC<{ banner: BannerDisplayState }> = ({ banner }) => (
  <div className="min-h-screen selection:bg-brand-500 selection:text-white font-sans relative">
    <IntroSplash />
    <Header banner={banner} />

    <main id="main-content" className={banner.visible ? 'pt-32 md:pt-36' : 'pt-20 md:pt-24'}>
      {HOME_SECTION_ORDER.map((section) => SECTIONS[section])}
    </main>

    <Footer />

    <ChatInterface />
    <VoiceCommand />
    <BookingModal />
    <ContactModal />
    <Toast />
  </div>
);
