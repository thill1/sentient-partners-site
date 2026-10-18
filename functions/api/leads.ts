interface Env {
  FORMSUBMIT_EMAIL?: string;
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

// FormSubmit rejects requests without a Referer, and ties activation to the
// sending domain, so always present the production site.
export const FORMSUBMIT_SITE = "https://sentientpartners.ai";

export async function sendToFormSubmit(targetEmail: string, lead: StoredLead) {
  const response = await fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      referer: `${FORMSUBMIT_SITE}/`,
      origin: FORMSUBMIT_SITE,
    },
    body: JSON.stringify({
      _subject:
        lead.intent === "blueprint"
          ? `New Business Inquiry - ${lead.name}`
          : `New Website Inquiry - ${lead.name}`,
      _template: "table",
      _captcha: "false",
      lead_id: lead.leadId,
      source: lead.source,
      intent: lead.intent,
      cta_label: lead.ctaLabel || "",
      sent_at: lead.submittedAt,
      referrer: lead.referrer,
      name: lead.name,
      email: lead.email,
      inquiry: lead.inquiry,
      user_agent: lead.userAgent,
    }),
  });

  // FormSubmit answers 200 with { success: "false" } on errors, so check both.
  let data: { success?: unknown; message?: unknown } = {};
  try {
    data = (await response.json()) as typeof data;
  } catch {
    // Non-JSON reply: treated as a failure below.
  }
  const delivered = response.ok && String(data.success) === "true";
  if (!delivered) {
    console.error("FormSubmit delivery failed", {
      status: response.status,
      message: typeof data.message === "string" ? data.message : "(no message)",
      leadId: lead.leadId,
    });
  }
  return delivered;
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

  const notificationEmail = env.FORMSUBMIT_EMAIL || "hello@sentientpartners.ai";
  if (notificationEmail) {
    deliveryAttempts.push(sendToFormSubmit(notificationEmail, lead));
  }

  if (!deliveryAttempts.length) {
    return json(
      {
        error: "No lead delivery destination is configured.",
      },
      { status: 500 },
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
