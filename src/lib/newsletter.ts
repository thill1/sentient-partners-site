export const NEWSLETTER_CONFIG_URL = "/insights-newsletter.json";

export const NEWSLETTER_ENDPOINT =
  "https://formsubmit.co/ajax/hello@sentientpartners.ai";

export type NewsletterProvider = "formsubmit" | "ghl-webhook";

export type NewsletterSignupConfig = {
  provider: NewsletterProvider;
  ghlWebhookUrl: string;
};

const GHL_URL_PLACEHOLDER = /REPLACE_WITH_GHL|PLACEHOLDER/i;

const defaultConfig = (): NewsletterSignupConfig => ({
  provider: "formsubmit",
  ghlWebhookUrl: "",
});

let configCache: NewsletterSignupConfig | null = null;

/** Clears cached signup config (tests). */
export function resetNewsletterConfigCache() {
  configCache = null;
}

export async function loadNewsletterSignupConfig(): Promise<NewsletterSignupConfig> {
  if (configCache) return configCache;
  try {
    const res = await fetch(NEWSLETTER_CONFIG_URL, { credentials: "same-origin" });
    if (res.ok) {
      const data = (await res.json()) as Partial<NewsletterSignupConfig>;
      configCache = {
        provider: data.provider === "ghl-webhook" ? "ghl-webhook" : "formsubmit",
        ghlWebhookUrl: String(data.ghlWebhookUrl ?? ""),
      };
      return configCache;
    }
  } catch {
    /* use FormSubmit default */
  }
  configCache = defaultConfig();
  return configCache;
}

/** True when GHL inbound webhook URL is set and not a placeholder. */
export function ghlWebhookReady(cfg: NewsletterSignupConfig): boolean {
  return (
    cfg.provider === "ghl-webhook" &&
    cfg.ghlWebhookUrl.startsWith("https://") &&
    !GHL_URL_PLACEHOLDER.test(cfg.ghlWebhookUrl)
  );
}

export const buildSignup = (email: string, honey = "") => ({
  _subject: `Newsletter signup - ${email}`,
  _captcha: "false",
  _template: "table",
  _honey: honey,
  email,
  source: "Insights signup",
});

export const buildGhlSignup = (email: string) => ({
  email: email.trim(),
  source: "insights-signup",
});

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

async function subscribeViaFormSubmit(email: string, honey: string): Promise<boolean> {
  try {
    const res = await fetch(NEWSLETTER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(buildSignup(email.trim(), honey)),
    });
    const data = (await res.json().catch(() => ({}))) as { success?: unknown };
    return res.ok && String(data.success) === "true";
  } catch {
    return false;
  }
}

async function subscribeViaGhlWebhook(url: string, email: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(buildGhlSignup(email)),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Insights newsletter signup. Uses GHL inbound webhook when configured; otherwise FormSubmit.
 * Honeypot fills are treated as success with no network call.
 */
export async function subscribe(email: string, honey = ""): Promise<boolean> {
  if (honey.trim()) return true;
  try {
    const cfg = await loadNewsletterSignupConfig();
    if (ghlWebhookReady(cfg)) {
      return subscribeViaGhlWebhook(cfg.ghlWebhookUrl, email);
    }
    return subscribeViaFormSubmit(email, honey);
  } catch {
    return false;
  }
}