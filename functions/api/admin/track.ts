import { verifyAdminSession } from "../../lib/adminAuth";
import { json } from "../../lib/http";
import { dayKey } from "../../lib/track";
import type { Env } from "../../types";

/** GET ?days=14 -> daily click counts, newest first. Admin session required. */
export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  if (!(await verifyAdminSession(request, env))) return json({ error: "Unauthorized." }, { status: 401 });
  if (!env.SITE_SETTINGS) return json({ configured: false, days: [] });
  const n = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 14));
  const days = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.now() - i * 86400_000);
    const raw = await env.SITE_SETTINGS.get(dayKey(d));
    days.push({ date: d.toISOString().slice(0, 10), counts: raw ? JSON.parse(raw) : {} });
  }
  return json({ configured: true, days });
};
