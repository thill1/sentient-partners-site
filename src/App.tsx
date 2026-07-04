import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminLogin } from './components/AdminLogin';
import { AdminPanel } from './components/AdminPanel';
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
import { IntroSplash } from './components/IntroSplash';
import { WhySentient } from './components/WhySentient';
import { HOME_SECTION_ORDER } from './content/siteContent';
import { getAdminSettings, loginAdmin, logoutAdmin, updateAdminSettings } from './lib/adminApi';
import type { SiteSettings } from './lib/siteSettingsSchema';
import { useSiteSettings } from './hooks/useSiteSettings';
import type { AppRoute } from './types';

function getCurrentRoute(hash: string): AppRoute {
  return hash === '#/admin' ? 'admin' : 'home';
}


function App() {
  const siteSettings = useSiteSettings();
  const [route, setRoute] = useState<AppRoute>(() => getCurrentRoute(window.location.hash));
  const [adminSettings, setAdminSettings] = useState<SiteSettings | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminStatus, setAdminStatus] = useState<string | null>(null);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);

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

  useEffect(() => {
    const onHashChange = () => {
      setRoute(getCurrentRoute(window.location.hash));
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const loadAdminSettings = useCallback(async () => {
    setIsAdminLoading(true);

    try {
      const settings = await getAdminSettings();
      setAdminSettings(settings);
      setAdminError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load admin settings.';

      if (message.includes('401')) {
        setAdminSettings(null);
        setAdminError(null);
      } else {
        setAdminError(message);
      }
    } finally {
      setIsAdminLoading(false);
    }
  }, []);

  useEffect(() => {
    if (route === 'admin') {
      void loadAdminSettings();
    }
  }, [loadAdminSettings, route]);

  const sectionComponents: Record<(typeof HOME_SECTION_ORDER)[number], React.ReactNode> = {
    hero: <Hero key="hero" />,
    why: <WhySentient key="why" />,
    services: <Services key="services" />,
    demo: <DemoSection key="demo" />,
    testimonials: <Testimonials key="testimonials" />,
    process: <Process key="process" />,
    pricing: <Pricing key="pricing" />,
    faq: <FAQ key="faq" />,
    cta: <CTASection key="cta" />,
  };

  const homeMainPaddingClasses = useMemo(
    () => (siteSettings.bannerState.visible ? 'pt-32 md:pt-36' : 'pt-20 md:pt-24'),
    [siteSettings.bannerState.visible],
  );

  const handleAdminLogin = useCallback(async (username: string, password: string) => {
    setIsLoggingIn(true);
    setAdminError(null);
    setAdminStatus(null);

    try {
      await loginAdmin({ username, password });
      await loadAdminSettings();
      setAdminStatus('Signed in successfully.');
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setIsLoggingIn(false);
    }
  }, [loadAdminSettings]);

  const handleAdminSave = useCallback(async (settings: SiteSettings) => {
    setIsSavingAdmin(true);
    setAdminError(null);
    setAdminStatus(null);

    try {
      const savedSettings = await updateAdminSettings(settings);
      setAdminSettings(savedSettings);
      siteSettings.applySettings(savedSettings);
      setAdminStatus('Settings saved.');
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Failed to save settings.');
    } finally {
      setIsSavingAdmin(false);
    }
  }, [siteSettings]);

  const handleAdminLogout = useCallback(async () => {
    await logoutAdmin();
    setAdminSettings(null);
    setAdminStatus('Signed out.');
  }, []);

  if (route === 'admin') {
    if (isAdminLoading && !adminSettings) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
          Loading admin settings...
        </div>
      );
    }

    if (!adminSettings) {
      return (
        <AdminLogin
          error={adminError}
          isSubmitting={isLoggingIn}
          onSubmit={handleAdminLogin}
        />
      );
    }

    return (
      <AdminPanel
        error={adminError}
        isSaving={isSavingAdmin}
        onLogout={handleAdminLogout}
        onSave={handleAdminSave}
        settings={adminSettings}
        status={adminStatus}
      />
    );
  }

  return (
    <div className="min-h-screen selection:bg-brand-500 selection:text-white font-sans relative">
      <IntroSplash />
      <Header banner={siteSettings.bannerState} />

      <main id="main-content" className={homeMainPaddingClasses}>
        {HOME_SECTION_ORDER.map((section) => sectionComponents[section])}
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
