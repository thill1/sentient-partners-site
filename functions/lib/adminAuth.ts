import type { AdminSessionPayload, Env } from '../types';
import { createCookie, parseCookieHeader, sha256 } from './http';

const ADMIN_SESSION_COOKIE = 'sp_admin_session';
const SESSION_SEPARATOR = '.';
const SESSION_TTL_SECONDS = 12 * 60 * 60;

function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  const length = Math.max(left.length, right.length);
  let mismatch = left.length === right.length ? 0 : 1;
  for (let i = 0; i < length; i++) mismatch |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return mismatch === 0;
}

async function secretsMatch(a: string, b: string): Promise<boolean> {
  const [left, right] = await Promise.all([sha256(a), sha256(b)]);
  return timingSafeEqual(left, right);
}

function getRequiredSecret(env: Env): string {
  return String(env.ADMIN_SESSION_SECRET || '').trim();
}

function getConfiguredUsername(env: Env): string {
  return String(env.ADMIN_USERNAME || '').trim();
}

async function signValue(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  const bytes = Array.from(new Uint8Array(signature));
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function encodeSession(payload: AdminSessionPayload): string {
  return btoa(JSON.stringify(payload));
}

function decodeSession(rawValue: string): AdminSessionPayload | null {
  try {
    const parsed = JSON.parse(atob(rawValue)) as Partial<AdminSessionPayload>;
    if (typeof parsed.username !== 'string' || parsed.username.trim().length === 0) {
      return null;
    }
    if (typeof parsed.exp !== 'number' || !Number.isFinite(parsed.exp) || parsed.exp * 1000 <= Date.now()) {
      return null;
    }
    return { username: parsed.username, exp: parsed.exp };
  } catch {
    return null;
  }
}

export async function verifyAdminCredentials(
  env: Env,
  username: string,
  password: string
): Promise<boolean> {
  const configuredUsername = getConfiguredUsername(env);
  if (!configuredUsername || !(await secretsMatch(configuredUsername, username))) {
    return false;
  }

  const configuredPassword = String(env.ADMIN_PASSWORD || '');
  if (configuredPassword && (await secretsMatch(configuredPassword, password))) {
    return true;
  }

  const configuredPasswordHash = String(env.ADMIN_PASSWORD_HASH || '').trim();
  if (!configuredPasswordHash) {
    return false;
  }

  return timingSafeEqual(await sha256(password), configuredPasswordHash);
}

export async function createAdminSessionCookie(env: Env, username: string): Promise<string> {
  const secret = getRequiredSecret(env);
  const payload = encodeSession({
    username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
  const signature = await signValue(payload, secret);

  return createCookie(ADMIN_SESSION_COOKIE, `${payload}${SESSION_SEPARATOR}${signature}`, {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
    sameSite: 'Strict',
    secure: true,
  });
}

export function clearAdminSessionCookie(): string {
  return createCookie(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'Strict',
    secure: true,
  });
}

export async function verifyAdminSession(request: Request, env: Env): Promise<AdminSessionPayload | null> {
  const secret = getRequiredSecret(env);
  if (!secret) {
    return null;
  }

  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const rawCookie = cookies[ADMIN_SESSION_COOKIE];
  if (!rawCookie) {
    return null;
  }

  const separatorIndex = rawCookie.lastIndexOf(SESSION_SEPARATOR);
  if (separatorIndex === -1) {
    return null;
  }

  const payload = rawCookie.slice(0, separatorIndex);
  const signature = rawCookie.slice(separatorIndex + 1);
  const expectedSignature = await signValue(payload, secret);

  if (!timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  return decodeSession(payload);
}
