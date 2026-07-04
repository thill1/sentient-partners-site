import { json } from './http';
import type { Env } from '../types';

interface VoiceProxyPayload {
  text: string;
  voiceId: string;
}

/**
 * Friendly voice aliases -> ElevenLabs stock voice IDs.
 * 'sp-agent' is the Sentient Partners house voice used across the site.
 */
const VOICE_ALIASES: Record<string, string> = {
  'sp-agent': 'EXAVITQu4vr4xnSDxMaL',
  'default-natural-voice': 'EXAVITQu4vr4xnSDxMaL',
  'sp-caller-dental': 'cgSgspJ2msm6clMCkdW9',
  'sp-caller-hvac': 'nPczCjzI2devNBz1zQrb',
  'sp-caller-law': 'XrExE9yKIg1WjnnlVkGX',
  'sp-caller-fitness': 'cjVigY5qzO86Huf0OWal',
};

const DEFAULT_ELEVENLABS_VOICE = 'EXAVITQu4vr4xnSDxMaL';
const ELEVENLABS_VOICE_ID_PATTERN = /^[A-Za-z0-9]{15,32}$/;

function resolveElevenLabsVoiceId(requested: string): string {
  const trimmed = String(requested || '').trim();
  if (VOICE_ALIASES[trimmed]) {
    return VOICE_ALIASES[trimmed];
  }
  if (ELEVENLABS_VOICE_ID_PATTERN.test(trimmed) && !trimmed.includes('-')) {
    return trimmed;
  }
  return DEFAULT_ELEVENLABS_VOICE;
}

const VOICE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const edgeCaches = caches as CacheStorage & { default: Cache };

async function buildVoiceCacheKey(text: string, voiceId: string, modelId: string): Promise<Request> {
  const data = new TextEncoder().encode(`${voiceId}|${modelId}|${text}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return new Request(`https://voice-cache.sentient-partners.internal/${hex}`);
}

function decodeBase64Audio(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function splitTextIntoChunks(text: string, maxLength = 180): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((currentChunk + " " + trimmed).trim().length <= maxLength) {
      currentChunk = (currentChunk + " " + trimmed).trim();
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      if (trimmed.length > maxLength) {
        const parts = trimmed.match(/.{1,180}/g) || [trimmed];
        chunks.push(...parts);
        currentChunk = "";
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

export async function proxyVoiceRequest(env: Env, payload: VoiceProxyPayload): Promise<Response> {
  const baseUrl = String(env.TTS_BASE_URL || '').trim();
  const apiKey = String(env.TTS_API_KEY || '').trim();

  // 100% Free, unlimited, zero-configuration Google TTS fallback helper
  const runGoogleFallback = async (): Promise<Response | null> => {
    try {
      const chunks = splitTextIntoChunks(payload.text);
      const audioBuffers: ArrayBuffer[] = [];

      for (const chunk of chunks) {
        const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(chunk)}`;
        const response = await fetch(fallbackUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          audioBuffers.push(buffer);
        } else {
          throw new Error(`Google TTS chunk fetch failed: ${response.status}`);
        }
      }

      if (audioBuffers.length > 0) {
        const totalLength = audioBuffers.reduce((acc, buf) => acc + buf.byteLength, 0);
        const joinedBuffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const buf of audioBuffers) {
          joinedBuffer.set(new Uint8Array(buf), offset);
          offset += buf.byteLength;
        }

        return new Response(joinedBuffer.buffer, {
          status: 200,
          headers: {
            'content-type': 'audio/mpeg',
            'cache-control': 'no-store',
            'x-sp-voice-source': 'fallback',
            'x-sp-voice-cache': 'bypass',
          },
        });
      }
    } catch (e) {
      console.error("Google TTS chunking fallback failed:", e);
    }
    return null;
  };

  if (!baseUrl) {
    const fallbackResponse = await runGoogleFallback();
    if (fallbackResponse) {
      return fallbackResponse;
    }
    return json({ error: 'Missing TTS_BASE_URL configuration and free fallback failed.' }, { status: 500 });
  }

  const modelId = String(env.TTS_MODEL_ID || '').trim() || "eleven_turbo_v2_5";
  let cacheKey: Request | null = null;

  try {
    cacheKey = await buildVoiceCacheKey(payload.text, payload.voiceId, modelId);
    const cached = await edgeCaches.default.match(cacheKey);
    if (cached) {
      const hitHeaders = new Headers(cached.headers);
      hitHeaders.set('cache-control', 'no-store');
      hitHeaders.set('x-sp-voice-source', 'premium');
      hitHeaders.set('x-sp-voice-cache', 'hit');
      return new Response(cached.body, { status: 200, headers: hitHeaders });
    }
  } catch {
    cacheKey = null;
  }

  try {
    let targetUrl = baseUrl;
    const headers = new Headers();
    let bodyString = "";

    const isElevenLabs = baseUrl.includes("elevenlabs.io") || baseUrl.includes("elevenlabs");

    if (isElevenLabs) {
      // Structure: https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
      const voiceId = resolveElevenLabsVoiceId(payload.voiceId);
      
      // Ensure we append the voiceId if not already in the URL
      if (!baseUrl.includes(voiceId)) {
        if (baseUrl.endsWith("text-to-speech") || baseUrl.endsWith("text-to-speech/")) {
          targetUrl = baseUrl.endsWith("/") ? `${baseUrl}${voiceId}` : `${baseUrl}/${voiceId}`;
        } else if (baseUrl.endsWith("elevenlabs.io") || baseUrl.endsWith("elevenlabs.io/")) {
          targetUrl = baseUrl.endsWith("/") ? `${baseUrl}v1/text-to-speech/${voiceId}` : `${baseUrl}/v1/text-to-speech/${voiceId}`;
        } else if (!baseUrl.includes("/v1/text-to-speech")) {
          targetUrl = baseUrl.endsWith("/") ? `${baseUrl}v1/text-to-speech/${voiceId}` : `${baseUrl}/v1/text-to-speech/${voiceId}`;
        }
      }

      headers.set("content-type", "application/json");
      if (apiKey) {
        headers.set("xi-api-key", apiKey);
      }

      bodyString = JSON.stringify({
        text: payload.text,
        model_id: modelId,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.8,
        }
      });
    } else {
      // Standard or custom TTS configuration
      headers.set("content-type", "application/json");
      if (apiKey) {
        headers.set("authorization", `Bearer ${apiKey}`);
      }
      bodyString = JSON.stringify(payload);
    }

    const upstreamResponse = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: bodyString,
    });

    if (!upstreamResponse.ok) {
      console.warn(`Upstream TTS failed (${upstreamResponse.status}). Attempting free Google fallback...`);
      const fallbackResponse = await runGoogleFallback();
      if (fallbackResponse) {
        return fallbackResponse;
      }
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
        console.warn("Upstream TTS JSON response missing audio payload. Attempting free Google fallback...");
        const fallbackResponse = await runGoogleFallback();
        if (fallbackResponse) {
          return fallbackResponse;
        }
        return json({ error: 'Voice provider returned no audio payload.' }, { status: 502 });
      }

      const decodedAudio = decodeBase64Audio(base64Audio);
      const normalizedAudio = new Uint8Array(Array.from(decodedAudio));

      if (cacheKey) {
        try {
          await edgeCaches.default.put(
            cacheKey,
            new Response(normalizedAudio.slice(0), {
              status: 200,
              headers: {
                'content-type': data.mimeType || 'audio/mpeg',
                'cache-control': `public, max-age=${VOICE_CACHE_TTL_SECONDS}`,
              },
            })
          );
        } catch {
          void 0; // cache writes are best-effort
        }
      }

      return new Response(new Blob([normalizedAudio], { type: data.mimeType || 'audio/mpeg' }), {
        status: 200,
        headers: {
          'content-type': data.mimeType || 'audio/mpeg',
          'cache-control': 'no-store',
          'x-sp-voice-source': 'premium',
          'x-sp-voice-cache': 'miss',
        },
      });
    }

    const audioBuffer = await upstreamResponse.arrayBuffer();

    if (cacheKey) {
      try {
        await edgeCaches.default.put(
          cacheKey,
          new Response(audioBuffer.slice(0), {
            status: 200,
            headers: {
              'content-type': contentType,
              'cache-control': `public, max-age=${VOICE_CACHE_TTL_SECONDS}`,
            },
          })
        );
      } catch {
        void 0; // cache writes are best-effort
      }
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'no-store',
        'x-sp-voice-source': 'premium',
        'x-sp-voice-cache': 'miss',
      },
    });
  } catch (err) {
    console.error("Error calling upstream TTS. Attempting free Google fallback...", err);
    const fallbackResponse = await runGoogleFallback();
    if (fallbackResponse) {
      return fallbackResponse;
    }
    return json({ error: 'Voice proxy request failed.' }, { status: 500 });
  }
}
