const encoder = new TextEncoder();

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, part) => {
    const [rawName, ...rawValueParts] = part.trim().split('=');
    const value = rawValueParts.join('=');

    if (!rawName || !value) {
      return cookies;
    }

    cookies[rawName] = decodeURIComponent(value);
    return cookies;
  }, {});
}

export function createCookie(name: string, value: string, options: {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
} = {}): string {
  const segments = [`${name}=${encodeURIComponent(value)}`];

  segments.push(`Path=${options.path ?? '/'}`);
  segments.push(`SameSite=${options.sameSite ?? 'Strict'}`);

  if (typeof options.maxAge === 'number') {
    segments.push(`Max-Age=${options.maxAge}`);
  }

  if (options.httpOnly !== false) {
    segments.push('HttpOnly');
  }

  if (options.secure !== false) {
    segments.push('Secure');
  }

  return segments.join('; ');
}

export function clearCookie(name: string, path = '/'): string {
  return createCookie(name, '', {
    maxAge: 0,
    path,
  });
}

export async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
