import { useCallback, useEffect, useMemo, useState } from 'react';
import { defaultSiteSettings, normalizeSiteSettings, type SiteSettings } from '../lib/siteSettingsSchema';
import type { BannerDisplayState, SiteSettingsState } from '../types';

export function getBannerDisplayState(settings: SiteSettings): BannerDisplayState {
  return {
    visible: settings.banner.enabled,
    message: settings.banner.message,
    ctaText: settings.banner.ctaText,
    ctaUrl: settings.banner.ctaUrl,
    variant: settings.banner.variant,
  };
}

async function fetchPublicSiteSettings(): Promise<SiteSettings> {
  const response = await fetch('/api/settings');
  if (!response.ok) {
    throw new Error(`Failed to load public settings (${response.status}).`);
  }

  const data = (await response.json()) as unknown;
  return normalizeSiteSettings(data);
}

export function useSiteSettings(): SiteSettingsState {
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const nextSettings = await fetchPublicSiteSettings();
      setSettings(nextSettings);
      setError(null);
    } catch (refreshError) {
      setSettings(defaultSiteSettings);
      setError(refreshError instanceof Error ? refreshError.message : 'Failed to load site settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const bannerState = useMemo(() => getBannerDisplayState(settings), [settings]);

  const applySettings = useCallback((nextSettings: SiteSettings) => {
    setSettings(normalizeSiteSettings(nextSettings));
    setError(null);
  }, []);

  return {
    settings,
    bannerState,
    error,
    isLoading,
    refresh,
    applySettings,
  };
}
