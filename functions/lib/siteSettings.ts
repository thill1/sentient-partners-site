import {
  defaultSiteSettings,
  normalizeSiteSettings,
  type SiteSettings,
} from '../../src/lib/siteSettingsSchema';
import type { Env } from '../types';

const SITE_SETTINGS_KEY = 'site_settings';

export async function getSiteSettings(env: Env): Promise<SiteSettings> {
  const storedValue = await env.SITE_SETTINGS?.get(SITE_SETTINGS_KEY);

  if (!storedValue) {
    return defaultSiteSettings;
  }

  try {
    return normalizeSiteSettings(JSON.parse(storedValue));
  } catch {
    return defaultSiteSettings;
  }
}

export async function saveSiteSettings(env: Env, settings: SiteSettings): Promise<SiteSettings> {
  const normalizedSettings = normalizeSiteSettings(settings);
  await env.SITE_SETTINGS?.put(SITE_SETTINGS_KEY, JSON.stringify(normalizedSettings));
  return normalizedSettings;
}
