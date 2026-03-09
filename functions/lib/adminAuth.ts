import type { AdminSessionPayload, Env } from '../types';
import { createCookie, parseCookieHeader, sha256 } from './http';

const ADMIN_SESSION_COOKIE = 'sp_admin_session';
const SESSION_SEPARATOR = '.';

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
    return { username: parsed.username };
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
  if (!configuredUsername || configuredUsername !== username) {
    return false;
  }

  const configuredPassword = String(env.ADMIN_PASSWORD || '');
  if (configuredPassword && configuredPassword === password) {
    return true;
  }

  const configuredPasswordHash = String(env.ADMIN_PASSWORD_HASH || '').trim();
  if (!configuredPasswordHash) {
    return false;
  }

  return (await sha256(password)) === configuredPasswordHash;
}

export async function createAdminSessionCookie(env: Env, username: string): Promise<string> {
  const secret = getRequiredSecret(env);
  const payload = encodeSession({ username });
  const signature = await signValue(payload, secret);

  return createCookie(ADMIN_SESSION_COOKIE, `${payload}${SESSION_SEPARATOR}${signature}`, {
    httpOnly: true,
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

  if (signature !== expectedSignature) {
    return null;
  }

  return decodeSession(payload);
}
