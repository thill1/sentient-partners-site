import { describe, expect, it } from 'vitest';
import { applyLegacyBannerOverride, INTRO_CALL_TEXT, INTRO_CALL_URL, normalizeSiteSettings } from './siteSettingsSchema';

const legacy = {
  banner: { enabled: true, message: 'Free AI Opportunity Review', ctaText: 'Get Review', ctaUrl: '#blueprint', variant: 'info' },
  ai: {},
};

describe('applyLegacyBannerOverride', () => {
  it('replaces the stored legacy offer with the intro call without mutating input', () => {
    const stored = normalizeSiteSettings(legacy);
    const snapshot = JSON.stringify(stored);
    const result = applyLegacyBannerOverride(stored);
    expect(result.banner.message).toBe(INTRO_CALL_TEXT);
    expect(result.banner.ctaText).toBe(INTRO_CALL_TEXT);
    expect(result.banner.ctaUrl).toBe(INTRO_CALL_URL);
    expect(result.banner.enabled).toBe(true);
    expect(JSON.stringify(stored)).toBe(snapshot);
  });

  it.each([
    { message: 'Free Workflow Audit', ctaText: 'Go', ctaUrl: 'https://x.test' },
    { message: 'Hi', ctaText: 'Go', ctaUrl: '/#blueprint' },
  ])('catches partial legacy matches %#', (banner) => {
    const result = applyLegacyBannerOverride(normalizeSiteSettings({ banner }));
    expect(result.banner.ctaUrl).toBe(INTRO_CALL_URL);
  });

  it('leaves non-legacy banners unchanged', () => {
    const s = normalizeSiteSettings({ banner: { message: 'Holiday hours', ctaText: 'Learn more', ctaUrl: '/contact' } });
    expect(applyLegacyBannerOverride(s)).toBe(s);
  });
});
