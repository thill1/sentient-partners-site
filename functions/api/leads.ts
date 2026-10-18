interface Env {
  LEADS_WEBHOOK_URL?: string;
}

interface PagesFunctionContext {
  request: Request;
  env: Env;
}

interface LeadPayload {
  name: string;
  email: string;
  inquiry: string;
  intent: "contact" | "blueprint";
  source: string;
  ctaLabel?: string;
}

interface StoredLead extends LeadPayload {
  leadId: string;
  submittedAt: string;
  referrer: string;
  userAgent: string;
}

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePayload(body: Record<string, unknown>): LeadPayload | null {
  const name = String(body.name || "").trim();
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const inquiry = String(body.inquiry || "").trim();
  const intent =
    body.intent === "blueprint"
      ? "blueprint"
      : body.intent === "contact"
        ? "contact"
        : "";
  const source = String(body.source || "").trim();
  const ctaLabel = String(body.ctaLabel || "").trim();

  if (!name || !email || !inquiry || !source || !intent) {
    return null;
  }

  if (!isValidEmail(email)) {
    return null;
  }

  return {
    name,
    email,
    inquiry,
    intent,
    source,
    ...(ctaLabel ? { ctaLabel } : {}),
  };
}

async function sendToWebhook(url: string, lead: StoredLead) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      event: "lead_submission",
      lead,
    }),
  });

  return response.ok;
}

export const onRequestGet = async () => {
  return json({
    ok: true,
    route: "/api/leads",
    note: "POST JSON { name, email, inquiry, intent, source, ctaLabel? } to capture a lead.",
  });
};

export const onRequestPost = async (context: PagesFunctionContext) => {
  const { request, env } = context;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const normalized = normalizePayload(body);
  if (!normalized) {
    return json(
      {
        error:
          "Missing or invalid lead fields. Expected name, email, inquiry, intent, and source.",
      },
      { status: 400 },
    );
  }

  const lead: StoredLead = {
    ...normalized,
    leadId: crypto.randomUUID(),
    submittedAt: new Date().toISOString(),
    referrer: request.headers.get("referer") || "",
    userAgent: request.headers.get("user-agent") || "",
  };

  const deliveryAttempts: Promise<boolean>[] = [];
  if (env.LEADS_WEBHOOK_URL) {
    deliveryAttempts.push(sendToWebhook(env.LEADS_WEBHOOK_URL, lead));
  }

  if (!deliveryAttempts.length) {
    return json(
      {
        ok: true,
        skipped: true,
        note: "Email delivery happens in the browser via FormSubmit; no webhook configured.",
      },
      { status: 200 },
    );
  }

  const results = await Promise.allSettled(deliveryAttempts);
  const delivered = results.some(
    (result) => result.status === "fulfilled" && result.value,
  );

  if (!delivered) {
    return json(
      {
        error: "Lead capture failed at all configured destinations.",
      },
      { status: 502 },
    );
  }

  return json({
    ok: true,
    leadId: lead.leadId,
    message:
      lead.intent === "blueprint"
        ? "Thanks. We received your note and will follow up soon."
        : "Thanks. We will be in touch shortly.",
  });
};
