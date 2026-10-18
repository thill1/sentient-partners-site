import { describe, expect, it } from 'vitest';
import { normalizeSiteSettings } from './siteSettingsSchema';

describe('normalizeSiteSettings', () => {
  it('fills defaults for missing banner and ai fields', () => {
    const result = normalizeSiteSettings({});
    expect(result.banner.message).toBe('Book a 20-minute introductory call');
    expect(result.ai.voiceEnabled).toBe(true);
  });
});
