export const NEWSLETTER_ENDPOINT =
  "https://formsubmit.co/ajax/hello@sentientpartners.ai";

export const buildSignup = (email: string, honey = "") => ({
  _subject: `Newsletter signup - ${email}`,
  _captcha: "false",
  _template: "table",
  _honey: honey,
  email,
  source: "Insights signup",
});

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** Success only when FormSubmit answers success "true". */
export async function subscribe(email: string, honey = ""): Promise<boolean> {
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
