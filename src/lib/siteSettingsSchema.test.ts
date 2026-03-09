import { describe, expect, it } from 'vitest';
import { normalizeSiteSettings } from './siteSettingsSchema';

describe('normalizeSiteSettings', () => {
  it('fills defaults for missing banner and ai fields', () => {
    const result = normalizeSiteSettings({});
    expect(result.banner.message).toBe('Free AI Opportunity Review');
    expect(result.ai.voiceEnabled).toBe(true);
  });
});
