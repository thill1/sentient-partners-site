import type { SiteSettings } from '../src/lib/siteSettingsSchema';

export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface Env {
  ADMIN_PASSWORD?: string;
  ADMIN_PASSWORD_HASH?: string;
  ADMIN_SESSION_SECRET?: string;
  ADMIN_USERNAME?: string;
  API_KEY?: string;
  GEMINI_API_KEY?: string;
  SENTIENT_SITE_MEMORY?: string;
  SITE_SETTINGS?: KVNamespaceLike;
  TTS_API_KEY?: string;
  TTS_BASE_URL?: string;
}

export interface AdminSessionPayload {
  username: string;
}

export type PersistedSiteSettings = SiteSettings;

declare global {
  type PagesFunction<EnvType = Env> = (context: {
    request: Request;
    env: EnvType;
  }) => Response | Promise<Response>;
}

export {};
