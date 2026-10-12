export type BannerVariant = 'info' | 'success' | 'warning';
export type VoiceProvider = 'self_hosted_tts';

export interface SiteBannerSettings {
  enabled: boolean;
  message: string;
  ctaText: string;
  ctaUrl: string;
  variant: BannerVariant;
}

export interface SiteAiSettings {
  voiceEnabled: boolean;
  voiceId: string;
  systemPrompt: string;
  siteMemory: string;
  voiceProvider: VoiceProvider;
}

export interface SiteSettings {
  banner: SiteBannerSettings;
  ai: SiteAiSettings;
}

export const defaultSiteSettings: SiteSettings = {
  banner: {
    enabled: true,
    message: 'Book a 20-minute introductory call',
    ctaText: 'Book a 20-minute introductory call',
    ctaUrl: 'https://cal.com/sentient-partners-strategy/introductory-call',
    variant: 'info',
  },
  ai: {
    voiceEnabled: true,
    voiceId: 'default-natural-voice',
    systemPrompt: '',
    siteMemory: '',
    voiceProvider: 'self_hosted_tts',
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asBannerVariant(value: unknown, fallback: BannerVariant): BannerVariant {
  return value === 'info' || value === 'success' || value === 'warning' ? value : fallback;
}

function asVoiceProvider(value: unknown, fallback: VoiceProvider): VoiceProvider {
  return value === 'self_hosted_tts' ? value : fallback;
}

export function normalizeSiteSettings(input: unknown): SiteSettings {
  const root = asRecord(input);
  const banner = asRecord(root.banner);
  const ai = asRecord(root.ai);

  return {
    banner: {
      enabled: asBoolean(banner.enabled, defaultSiteSettings.banner.enabled),
      message: asString(banner.message, defaultSiteSettings.banner.message),
      ctaText: asString(banner.ctaText, defaultSiteSettings.banner.ctaText),
      ctaUrl: asString(banner.ctaUrl, defaultSiteSettings.banner.ctaUrl),
      variant: asBannerVariant(banner.variant, defaultSiteSettings.banner.variant),
    },
    ai: {
      voiceEnabled: asBoolean(ai.voiceEnabled, defaultSiteSettings.ai.voiceEnabled),
      voiceId: asString(ai.voiceId, defaultSiteSettings.ai.voiceId),
      systemPrompt: asString(ai.systemPrompt, defaultSiteSettings.ai.systemPrompt),
      siteMemory: asString(ai.siteMemory, defaultSiteSettings.ai.siteMemory),
      voiceProvider: asVoiceProvider(ai.voiceProvider, defaultSiteSettings.ai.voiceProvider),
    },
  };
}

export const INTRO_CALL_TEXT = 'Book a 20-minute introductory call';
export const INTRO_CALL_URL = 'https://cal.com/sentient-partners-strategy/introductory-call';

const LEGACY_OFFER_PATTERN = /ai opportunity review|get review|audit/i;

function isLegacyOffer(banner: SiteBannerSettings): boolean {
  return (
    LEGACY_OFFER_PATTERN.test(banner.message) ||
    LEGACY_OFFER_PATTERN.test(banner.ctaText) ||
    LEGACY_OFFER_PATTERN.test(banner.ctaUrl) ||
    banner.ctaUrl.trim().toLowerCase().endsWith('#blueprint')
  );
}

/**
 * Display-time override for banners still carrying the retired audit /
 * "AI Opportunity Review" offer. Returns a new object; stored data is untouched.
 */
export function applyLegacyBannerOverride(settings: SiteSettings): SiteSettings {
  if (!isLegacyOffer(settings.banner)) return settings;
  return {
    ...settings,
    banner: { ...settings.banner, message: INTRO_CALL_TEXT, ctaText: INTRO_CALL_TEXT, ctaUrl: INTRO_CALL_URL },
  };
}
