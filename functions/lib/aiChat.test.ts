import { describe, expect, it } from 'vitest';
import {
  GEMINI_MODELS,
  GROQ_MODELS,
  buildGroqBody,
  detectProvider,
  generateChatReply,
  resolveKeyCandidates,
  shouldFallThrough,
} from './aiChat';

const req = { systemInstruction: 'sys', history: [], message: 'hi' };

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function groqOk(text: string, model = 'openai/gpt-oss-120b') {
  return jsonResponse(200, { model, choices: [{ message: { content: text } }] });
}

function geminiOk(text: string) {
  return jsonResponse(200, { candidates: [{ content: { parts: [{ text }] } }] });
}

const modelNotFound = () =>
  jsonResponse(404, {
    error: {
      message: 'The model `llama-3.3-70b-versatile` does not exist or you do not have access to it.',
      type: 'invalid_request_error',
      code: 'model_not_found',
    },
  });

function mockFetch(responses: (() => Response | Promise<Response>)[]) {
  const calls: { url: string; body: any; headers: Record<string, string> }[] = [];
  const impl = async (url: string, init?: RequestInit) => {
    calls.push({
      url,
      body: JSON.parse(String(init?.body || '{}')),
      headers: (init?.headers || {}) as Record<string, string>,
    });
    const next = responses.shift();
    if (!next) throw new Error('unexpected fetch');
    return next();
  };
  return { impl, calls };
}

describe('detectProvider / resolveKeyCandidates', () => {
  it('detects providers by key prefix', () => {
    expect(detectProvider('gsk_abc')).toBe('groq');
    expect(detectProvider('AIzaXYZ')).toBe('gemini');
    expect(detectProvider('sk-other')).toBeNull();
  });

  it('dedupes keys, keeps env order, and treats unknown prefixes as Gemini', () => {
    const c = resolveKeyCandidates({ GROQ_API_KEY: 'gsk_1', API_KEY: 'gsk_1', GEMINI_API_KEY: 'other' });
    expect(c).toEqual([
      { provider: 'groq', apiKey: 'gsk_1' },
      { provider: 'gemini', apiKey: 'other' },
    ]);
    expect(resolveKeyCandidates({})).toEqual([]);
  });
});

describe('shouldFallThrough', () => {
  it('falls through on unavailable models, throttling and upstream errors but not bad keys', () => {
    for (const s of [0, 400, 403, 404, 408, 429, 500, 503]) expect(shouldFallThrough(s)).toBe(true);
    expect(shouldFallThrough(401)).toBe(false);
  });
});

describe('buildGroqBody', () => {
  it('hides reasoning and widens the budget for GPT-OSS models', () => {
    const b = buildGroqBody('openai/gpt-oss-120b', req);
    expect(b.include_reasoning).toBe(false);
    expect(b.reasoning_effort).toBe('low');
    expect(b.max_tokens).toBeUndefined();
  });
  it('keeps max_tokens 900 for llama models', () => {
    expect(buildGroqBody('llama-3.1-8b-instant', req).max_tokens).toBe(900);
  });
});

describe('generateChatReply', () => {
  it('returns the first Groq model reply in the frontend response shape', async () => {
    const { impl, calls } = mockFetch([() => groqOk('Hello there')]);
    const r = await generateChatReply([{ provider: 'groq', apiKey: 'gsk_x' }], req, impl);
    expect(r).toEqual({ ok: true, text: 'Hello there', model: 'openai/gpt-oss-120b', provider: 'groq' });
    expect(calls[0].url).toContain('api.groq.com');
    expect(calls[0].body.model).toBe(GROQ_MODELS[0]);
  });

  it('falls through model_not_found, 429 and 5xx to the next Groq model', async () => {
    const { impl, calls } = mockFetch([
      modelNotFound,
      () => jsonResponse(429, { error: { message: 'rate limited' } }),
      () => jsonResponse(503, { error: { message: 'over capacity' } }),
      () => groqOk('From 8B', 'llama-3.1-8b-instant'),
    ]);
    const r = await generateChatReply([{ provider: 'groq', apiKey: 'gsk_x' }], req, impl);
    expect(r.ok).toBe(true);
    expect(calls.map((c) => c.body.model)).toEqual([...GROQ_MODELS]);
  });

  it('falls through a decommissioned 400 and an empty completion', async () => {
    const { impl } = mockFetch([
      () => jsonResponse(400, { error: { code: 'model_decommissioned', message: 'decommissioned' } }),
      () => groqOk(''),
      () => groqOk('ok now', 'llama-3.3-70b-versatile'),
    ]);
    const r = await generateChatReply([{ provider: 'groq', apiKey: 'gsk_x' }], req, impl);
    expect(r).toMatchObject({ ok: true, text: 'ok now', model: 'llama-3.3-70b-versatile' });
  });

  it('uses the Gemini REST API with the ordered Gemini model list for AIza keys', async () => {
    const { impl, calls } = mockFetch([
      () => jsonResponse(404, { error: { code: 404, message: 'models/gemini-3.8-flash is not found', status: 'NOT_FOUND' } }),
      () => geminiOk('Gemini says hi'),
    ]);
    const r = await generateChatReply([{ provider: 'gemini', apiKey: 'AIza1' }], req, impl);
    expect(r).toEqual({ ok: true, text: 'Gemini says hi', model: GEMINI_MODELS[1], provider: 'gemini' });
    expect(calls[0].url).toContain(`models/${GEMINI_MODELS[0]}:generateContent`);
    expect(calls[0].headers['x-goog-api-key']).toBe('AIza1');
    expect(calls[0].body.systemInstruction.parts[0].text).toBe('sys');
    expect(calls[1].body.contents.at(-1)).toEqual({ role: 'user', parts: [{ text: 'hi' }] });
  });

  it('skips the rest of a key on 401 and tries the next key', async () => {
    const { impl, calls } = mockFetch([
      () => jsonResponse(401, { error: { message: 'Invalid API Key' } }),
      () => geminiOk('backup'),
    ]);
    const r = await generateChatReply(
      [
        { provider: 'groq', apiKey: 'gsk_bad' },
        { provider: 'gemini', apiKey: 'AIza2' },
      ],
      req,
      impl,
    );
    expect(r).toMatchObject({ ok: true, provider: 'gemini' });
    expect(calls).toHaveLength(2);
  });

  it('reports the last error with 429 retry info when every model is throttled', async () => {
    const { impl } = mockFetch(
      GROQ_MODELS.map(() => () => new Response('{"error":{"message":"slow down"}}', { status: 429, headers: { 'retry-after': '12' } })),
    );
    const r = await generateChatReply([{ provider: 'groq', apiKey: 'gsk_x' }], req, impl);
    expect(r).toMatchObject({ ok: false, status: 429, retryAfterSeconds: 12 });
  });

  it('treats network errors as fall-through', async () => {
    const { impl } = mockFetch([
      () => {
        throw new Error('ECONNRESET');
      },
      () => groqOk('recovered', 'openai/gpt-oss-20b'),
    ]);
    const r = await generateChatReply([{ provider: 'groq', apiKey: 'gsk_x' }], req, impl);
    expect(r).toMatchObject({ ok: true, text: 'recovered' });
  });
});
