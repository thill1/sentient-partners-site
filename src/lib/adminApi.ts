import {
  normalizeSiteSettings,
  type SiteAiSettings,
  type SiteBannerSettings,
  type SiteSettings,
} from './siteSettingsSchema';

export interface AdminLoginRequest {
  password: string;
  username: string;
}

export interface SiteSettingsUpdate {
  banner?: Partial<SiteBannerSettings>;
  ai?: Partial<SiteAiSettings>;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function mergeSettingsUpdate(current: SiteSettings, update: SiteSettingsUpdate): SiteSettings {
  return normalizeSiteSettings({
    ...current,
    banner: {
      ...current.banner,
      ...update.banner,
    },
    ai: {
      ...current.ai,
      ...update.ai,
    },
  });
}

export async function loginAdmin(payload: AdminLoginRequest): Promise<{ ok: boolean }> {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<{ ok: boolean }>(response);
}

export async function logoutAdmin(): Promise<{ ok: boolean }> {
  const response = await fetch('/api/admin/logout', {
    method: 'POST',
  });

  return parseJsonResponse<{ ok: boolean }>(response);
}

export async function getAdminSettings(): Promise<SiteSettings> {
  const response = await fetch('/api/admin/settings');
  return parseJsonResponse<SiteSettings>(response);
}

export async function updateAdminSettings(settings: SiteSettings): Promise<SiteSettings> {
  const response = await fetch('/api/admin/settings', {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(settings),
  });

  return parseJsonResponse<SiteSettings>(response);
}
