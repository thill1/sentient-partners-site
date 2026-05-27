import { json } from '../lib/http';
import { proxyVoiceRequest } from '../lib/voiceProxy';

interface VoiceRequestBody {
  text?: string;
  voiceId?: string;
}

export const onRequestPost: PagesFunction = async (context) => {
  let body: VoiceRequestBody;

  try {
    body = (await context.request.json()) as VoiceRequestBody;
  } catch {
    return json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const text = String(body.text || '').trim();
  const voiceId = String(body.voiceId || '').trim();

  if (!text || !voiceId) {
    return json({ error: 'Both text and voiceId are required.' }, { status: 400 });
  }

  return proxyVoiceRequest(context.env, { text, voiceId });
};
