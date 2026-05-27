import { createAdminSessionCookie, verifyAdminCredentials } from '../../lib/adminAuth';
import { json } from '../../lib/http';
import type { Env } from '../../types';

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
