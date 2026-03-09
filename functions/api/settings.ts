import { json } from '../lib/http';
import { getSiteSettings } from '../lib/siteSettings';
import type { Env } from '../types';

interface PagesFunctionContext {
  env: Env;
}

export const onRequestGet = async (context: PagesFunctionContext) => {
  const settings = await getSiteSettings(context.env);

  return json({
    banner: settings.banner,
    ai: {
      voiceEnabled: settings.ai.voiceEnabled,
      voiceId: settings.ai.voiceId,
      voiceProvider: settings.ai.voiceProvider,
      systemPrompt: '',
      siteMemory: '',
    },
  });
};
