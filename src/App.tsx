import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { AdminLogin } from './components/AdminLogin';
import { AdminPanel } from './components/AdminPanel';
import { VoiceCommand } from './components/VoiceCommand';
import { ChatInterface } from './components/ChatInterface';
import { BookingModal } from './components/BookingModal';
import { ContactModal } from './components/ContactModal';
import { Toast } from './components/Toast';
import { Epic } from './components/epic/Epic';
import { rememberVisit } from './lib/visitorMemory';
import { getAdminSettings, loginAdmin, logoutAdmin, updateAdminSettings } from './lib/adminApi';
import type { SiteSettings } from './lib/siteSettingsSchema';
import { useSiteSettings } from './hooks/useSiteSettings';
import type { AppRoute } from './types';

// The earlier designs are code-split so homepage visitors never download them.
const CaliforniaConcept = lazy(() =>
  import('./components/california/CaliforniaConcept').then((m) => ({ default: m.CaliforniaConcept })),
);
const HomePage = lazy(() =>
  import('./components/home/HomePage').then((m) => ({ default: m.HomePage })),
);
const Flagship = lazy(() =>
  import('./components/flagship/Flagship').then((m) => ({ default: m.Flagship })),
);
const ClassicHome = lazy(() =>
  import('./components/ClassicHome').then((m) => ({ default: m.ClassicHome })),
);

function getCurrentRoute(hash: string): AppRoute {
  if (hash === '#/admin') return 'admin';
  if (hash === '#/california') return 'california';
  if (hash === '#/classic') return 'classic';
  if (hash === '#/v1') return 'v1';
  if (hash === '#/v2') return 'v2';
  return 'home';
}


function App() {
  const siteSettings = useSiteSettings();

  useEffect(() => {
    if (!window.sessionStorage.getItem('sp-visit-counted')) {
      window.sessionStorage.setItem('sp-visit-counted', '1');
      rememberVisit();
    }
  }, []);
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

  // California Intelligence concept: no intro splash, no production header or
  // banner. Booking, contact, Concierge, and Voice Command are shared unchanged.
  if (route === 'california') {
    return (
      <>
        <Suspense fallback={<div className="min-h-screen bg-ca-deep" />}>
          <CaliforniaConcept />
        </Suspense>
        <ChatInterface launcher="concept" />
        <VoiceCommand variant="concept" />
        <BookingModal variant="concept" />
        <ContactModal variant="concept" />
        <Toast />
      </>
    );
  }

  // The previous homepage, kept reachable while the redesign is reviewed.
  if (route === 'classic') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-dark-bg" />}>
        <ClassicHome banner={siteSettings.bannerState} />
      </Suspense>
    );
  }

  // Homepage: Global Experience. Local Impact. Booking, contact and the
  // Concierge are the same shared components the other routes use. /#/v1 (the
  // eight-card grid) and /#/v2 (photographs, fog and redwood) are earlier
  // versions of this homepage, kept for comparison.
  return (
    <>
      {route === 'v1' || route === 'v2' ? (
        <Suspense fallback={<div className="min-h-screen bg-sp-ivory" />}>{route === 'v1' ? <HomePage /> : <Flagship />}</Suspense>
      ) : (
        <Epic />
      )}
      <ChatInterface
        launcher="concept"
        mobileInlineOnly
        hideLauncherInsideCapabilities={route !== 'v1' && route !== 'v2'}
      />
      <BookingModal variant="concept" />
      <ContactModal variant="concept" />
      <Toast />
    </>
  );
}

export default App;
