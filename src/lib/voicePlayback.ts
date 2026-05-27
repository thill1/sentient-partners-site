export interface VoicePlaybackOptions {
  voiceId: string;
}

export interface VoiceRequestBody {
  text: string;
  voiceId: string;
}

export function createVoiceRequestBody(text: string, options: VoicePlaybackOptions): VoiceRequestBody {
  return {
    text,
    voiceId: options.voiceId,
  };
}
