import { describe, expect, it } from 'vitest';
import { mergeSettingsUpdate } from './adminApi';

describe('mergeSettingsUpdate', () => {
  it('overrides banner fields without removing unrelated ai settings', () => {
    const result = mergeSettingsUpdate(
      {
        banner: { enabled: true, message: 'A', ctaText: 'B', ctaUrl: '#', variant: 'info' },
        ai: {
          voiceEnabled: true,
          voiceId: 'default',
          systemPrompt: 'x',
          siteMemory: 'y',
          voiceProvider: 'self_hosted_tts',
        },
      },
      { banner: { message: 'New banner' } }
    );

    expect(result.banner.message).toBe('New banner');
    expect(result.ai.voiceId).toBe('default');
  });
});
