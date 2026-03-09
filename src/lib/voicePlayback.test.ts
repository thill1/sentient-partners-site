import { describe, expect, it } from 'vitest';
import { createVoiceRequestBody } from './voicePlayback';

describe('createVoiceRequestBody', () => {
  it('includes the configured voice id and text', () => {
    expect(
      createVoiceRequestBody('Hello there', { voiceId: 'default-natural-voice' })
    ).toEqual({
      text: 'Hello there',
      voiceId: 'default-natural-voice'
    });
  });
});
