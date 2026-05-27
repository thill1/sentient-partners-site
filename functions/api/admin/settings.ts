import { verifyAdminSession } from '../../lib/adminAuth';
import { json } from '../../lib/http';
import { getSiteSettings, saveSiteSettings } from '../../lib/siteSettings';
import { normalizeSiteSettings } from '../../../src/lib/siteSettingsSchema';
import type { Env } from '../../types';

interface PagesFunctionContext {
  request: Request;
  env: Env;
}

async function requireAdminSession(request: Request, env: Env): Promise<Response | null> {
  const session = await verifyAdminSession(request, env);

  if (!session) {
    return json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return null;
}

export const onRequestGet = async (context: PagesFunctionContext) => {
  const unauthorizedResponse = await requireAdminSession(context.request, context.env);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const settings = await getSiteSettings(context.env);
  return json(settings);
};

export const onRequestPut = async (context: PagesFunctionContext) => {
  const unauthorizedResponse = await requireAdminSession(context.request, context.env);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  let body: unknown;

  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const settings = normalizeSiteSettings(body);
  const savedSettings = await saveSiteSettings(context.env, settings);

  return json(savedSettings);
};
