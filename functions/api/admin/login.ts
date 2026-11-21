import { createAdminSessionCookie, verifyAdminCredentials } from '../../lib/adminAuth';
import { json } from '../../lib/http';
import type { Env } from '../../types';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

function tooManyAttempts(ip: string, now = Date.now()): number | null {
  const current = attempts.get(ip);
  if (!current || current.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }
  current.count += 1;
  if (current.count <= MAX_ATTEMPTS) return null;
  return Math.max(1, Math.ceil((current.resetAt - now) / 1000));
}

interface PagesFunctionContext {
  request: Request;
  env: Env;
}

export const onRequestPost = async (context: PagesFunctionContext) => {
  let body: Record<string, unknown>;

  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const username = String(body.username || '').trim();
  const password = String(body.password || '');

  if (!username || !password) {
    return json({ error: 'Username and password are required.' }, { status: 400 });
  }

  const ip = context.request.headers.get('cf-connecting-ip') ?? 'unknown';
  const retryAfter = tooManyAttempts(ip);
  if (retryAfter !== null) {
    return json(
      { error: 'Too many sign-in attempts. Try again later.' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } }
    );
  }

  const isValid = await verifyAdminCredentials(context.env, username, password);
  if (!isValid) {
    return json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const sessionCookie = await createAdminSessionCookie(context.env, username);

  return json(
    { ok: true },
    {
      headers: {
        'set-cookie': sessionCookie,
      },
    }
  );
};
