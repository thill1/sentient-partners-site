import { clearAdminSessionCookie } from '../../lib/adminAuth';
import { json } from '../../lib/http';

export const onRequestPost = async () =>
  json(
    { ok: true },
    {
      headers: {
        'set-cookie': clearAdminSessionCookie(),
      },
    }
  );
