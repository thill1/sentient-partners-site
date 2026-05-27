import { describe, expect, it } from 'vitest';
import { getBannerDisplayState } from './useSiteSettings';

describe('getBannerDisplayState', () => {
  it('returns hidden when banner is disabled', () => {
    const result = getBannerDisplayState({
      banner: { enabled: false, message: 'x', ctaText: 'y', ctaUrl: '#', variant: 'info' },
      ai: { voiceEnabled: true, voiceId: 'default', systemPrompt: 'x', siteMemory: 'y', voiceProvider: 'self_hosted_tts' }
    });

    expect(result.visible).toBe(false);
  });
});
