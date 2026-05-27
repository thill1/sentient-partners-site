import { json } from './http';
import type { Env } from '../types';

interface VoiceProxyPayload {
  text: string;
  voiceId: string;
}

function decodeBase64Audio(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export async function proxyVoiceRequest(env: Env, payload: VoiceProxyPayload): Promise<Response> {
  const baseUrl = String(env.TTS_BASE_URL || '').trim();
  if (!baseUrl) {
    // 100% Free, unlimited, zero-configuration Google TTS fallback!
    const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(payload.text)}`;
    try {
      const response = await fetch(fallbackUrl);
      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        return new Response(audioBuffer, {
          status: 200,
          headers: {
            'content-type': 'audio/mpeg',
            'cache-control': 'no-store',
          },
        });
      }
    } catch {
      // Proceed to error fallback
    }
    return json({ error: 'Missing TTS_BASE_URL configuration and free fallback failed.' }, { status: 500 });
  }

  const headers = new Headers({
    'content-type': 'application/json',
  });

  const apiKey = String(env.TTS_API_KEY || '').trim();
  if (apiKey) {
    headers.set('authorization', `Bearer ${apiKey}`);
  }

  const upstreamResponse = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!upstreamResponse.ok) {
    return json({ error: 'Voice provider request failed.' }, { status: upstreamResponse.status });
  }

  const contentType = upstreamResponse.headers.get('content-type') || 'audio/mpeg';

  if (contentType.includes('application/json')) {
    const data = (await upstreamResponse.json()) as {
      audio?: string;
      audioBase64?: string;
      mimeType?: string;
    };
    const base64Audio = data.audioBase64 || data.audio;

    if (!base64Audio) {
      return json({ error: 'Voice provider returned no audio payload.' }, { status: 502 });
    }

    const decodedAudio = decodeBase64Audio(base64Audio);
    const normalizedAudio = new Uint8Array(Array.from(decodedAudio));

    return new Response(new Blob([normalizedAudio], { type: data.mimeType || 'audio/mpeg' }), {
      status: 200,
      headers: {
        'content-type': data.mimeType || 'audio/mpeg',
        'cache-control': 'no-store',
      },
    });
  }

  const audioBuffer = await upstreamResponse.arrayBuffer();

  return new Response(audioBuffer, {
    status: 200,
    headers: {
      'content-type': contentType,
      'cache-control': 'no-store',
    },
  });
}
