/**
 * Free website check: pure helpers (URL safety + HTML analysis) so they can be
 * unit-tested without the Workers runtime. The Pages Function in
 * functions/api/site-check.ts does the fetching and the optional AI summary.
 */

export type CheckStatus = "pass" | "warn" | "fail";

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  weight: number;
}

export interface FetchFacts {
  finalUrl: string;
  status: number;
  responseMs: number;
  htmlBytes: number;
}

/** Normalizes visitor input into a public http(s) URL, or explains why not. */
export function normalizeTarget(input: string): { url?: URL; error?: string } {
  const raw = String(input || "").trim();
  if (!raw) return { error: "Enter your website address." };
  if (raw.length > 200) return { error: "That address is too long." };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { error: "That doesn't look like a website address." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { error: "Only web addresses (http or https) can be checked." };
  }
  if (url.username || url.password) {
    return { error: "Remove the username or password from the address." };
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    return { error: "Only standard web ports can be checked." };
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") || /\.(local|internal|localhost|lan|home|corp)$/.test(host)) {
    return { error: "Enter a public website address, like yourbusiness.com." };
  }
  if (isPrivateHost(host)) {
    return { error: "Enter a public website address, like yourbusiness.com." };
  }
  url.hash = "";
  return { url };
}

function isPrivateHost(host: string): boolean {
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.startsWith("[") || host.includes(":")) return true; // IPv6 literals: refuse.
  const ip = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ip) return false;
  const [a, b] = [Number(ip[1]), Number(ip[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function metaContent(html: string, key: string, attr = "name"): string {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const name = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
    if (name?.toLowerCase() === key) {
      return decode(tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1] ?? "");
    }
  }
  return "";
}

const BOOKING =
  /(calendly\.com|cal\.com|acuityscheduling|squareup\.com\/appointments|book\.housecallpro|housecallpro\.com|getjobber\.com|clienthub|servicetitan|schedulista|setmore|booksy|vagaro|mindbodyonline|simplybook|youcanbook\.me|zocdoc|opentable|resy\.com|tockhq|\/book(ing)?\b|\/schedule\b|\/appointments?\b|book (now|online|a|an|your)|schedule (now|online|a|an|your|service)|request (a |an )?(quote|estimate|appointment))/i;
const CHAT =
  /(intercom|drift\.com|tawk\.to|crisp\.chat|livechatinc|livechat\.com|hs-scripts\.com|hubspot.*conversations|tidio|zopim|zendesk.*(widget|chat)|podium|birdeye|olark|smartsupp|chatra|messenger-chat|fb-customerchat|freshchat|gorgias|chatbase|voiceflow|botpress|landbot|manychat|elfsight.*chat|sentientpartners)/i;

/** Analyzes a page's HTML and fetch facts into a list of plain-language checks. */
export function analyzeHtml(html: string, facts: FetchFacts): CheckResult[] {
  const out: CheckResult[] = [];
  const add = (r: CheckResult) => out.push(r);
  const lower = html.toLowerCase();

  const https = facts.finalUrl.startsWith("https://");
  add({
    id: "https",
    label: "Secure connection",
    status: https ? "pass" : "fail",
    detail: https
      ? "Your site loads over HTTPS, so browsers show it as secure."
      : "Your site isn't loading over HTTPS. Browsers warn visitors, and search engines rank it lower.",
    weight: 2,
  });

  const viewport = metaContent(html, "viewport");
  const mobile = /width\s*=\s*device-width/i.test(viewport);
  add({
    id: "mobile",
    label: "Built for phones",
    status: mobile ? "pass" : "fail",
    detail: mobile
      ? "The page tells phones to fit the screen."
      : "The page isn't set up to fit phone screens. Most local searches happen on a phone.",
    weight: 2,
  });

  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const description = metaContent(html, "description");
  const titleOk = title.length >= 10 && title.length <= 70;
  const descOk = description.length >= 50 && description.length <= 170;
  add({
    id: "search-snippet",
    label: "Search result preview",
    status: titleOk && descOk ? "pass" : title ? "warn" : "fail",
    detail: !title
      ? "There's no page title, so search engines have to guess what you do."
      : titleOk && descOk
        ? `Clear title and description. Searchers see: “${title.slice(0, 70)}”.`
        : !description
          ? "There's no meta description, so Google writes its own snippet from whatever it finds."
          : "Your title or description is too short or too long to show well in search results.",
    weight: 2,
  });

  const h1s = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) ?? [];
  add({
    id: "headline",
    label: "One clear headline",
    status: h1s.length === 1 ? "pass" : h1s.length === 0 ? "fail" : "warn",
    detail:
      h1s.length === 1
        ? "The page has one main headline, which helps visitors and search engines."
        : h1s.length === 0
          ? "No main headline (H1) was found. Visitors should know what you do in one glance."
          : `The page has ${h1s.length} main headlines (H1s). One clear headline reads better.`,
    weight: 1,
  });

  const telLink = /href\s*=\s*["']tel:/i.test(html);
  const phoneText = /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/.test(
    html.replace(/<script[\s\S]*?<\/script>/gi, ""),
  );
  add({
    id: "call",
    label: "Easy to call",
    status: telLink ? "pass" : phoneText ? "warn" : "fail",
    detail: telLink
      ? "Your phone number is a tap-to-call link."
      : phoneText
        ? "Your number is on the page, but it isn't a tap-to-call link on phones."
        : "We couldn't find a phone number on the page.",
    weight: 2,
  });

  const form = /<form\b/i.test(html);
  const booking = BOOKING.test(html);
  add({
    id: "book",
    label: "A clear next step",
    status: booking ? "pass" : form ? "warn" : "fail",
    detail: booking
      ? "Visitors can book or request an estimate online."
      : form
        ? "There's a form, but no obvious way to book or request an estimate online."
        : "There's no online booking, estimate request or contact form on the page.",
    weight: 2,
  });

  const ld = (html.match(/<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) ?? []).join(" ");
  const local = /"@type"\s*:\s*\[?[^\]]*"(LocalBusiness|[A-Za-z]*(Service|Store|Contractor|Business|Restaurant|Dentist|Physician|Plumber|Electrician|HVACBusiness|RoofingContractor|AutoRepair|LegalService|AccountingService|RealEstateAgent|HealthAndBeautyBusiness|ExerciseGym|SportsActivityLocation)|Organization)"/i.test(ld);
  const address = /"(address|telephone)"\s*:/i.test(ld);
  add({
    id: "local",
    label: "Local search signals",
    status: local && address ? "pass" : local ? "warn" : "fail",
    detail:
      local && address
        ? "Structured business details (name, address or phone) are there for Google and AI assistants."
        : local
          ? "Business details are partly marked up, but without an address or phone."
          : "No structured business details were found. Google and AI assistants have to guess your location and hours.",
    weight: 2,
  });

  const chat = CHAT.test(lower);
  add({
    id: "after-hours",
    label: "After-hours answers",
    status: chat ? "pass" : "warn",
    detail: chat
      ? "There's a chat assistant, so visitors can get answers at any hour."
      : "No chat or AI assistant was found. Questions that come in after hours wait until morning.",
    weight: 1,
  });

  const ogTitle = metaContent(html, "og:title", "property");
  const ogImage = metaContent(html, "og:image", "property");
  add({
    id: "share",
    label: "Link preview when shared",
    status: ogTitle && ogImage ? "pass" : ogTitle || ogImage ? "warn" : "fail",
    detail:
      ogTitle && ogImage
        ? "Links to your site show a title and image in texts and social posts."
        : "Links to your site won't show a proper preview image and title when shared.",
    weight: 1,
  });

  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  const withAlt = imgs.filter((t) => /\salt\s*=\s*["'][^"']+["']/i.test(t)).length;
  const altRatio = imgs.length ? withAlt / imgs.length : 1;
  add({
    id: "alt",
    label: "Image descriptions",
    status: altRatio >= 0.8 ? "pass" : altRatio >= 0.4 ? "warn" : "fail",
    detail: imgs.length
      ? `${withAlt} of ${imgs.length} images have descriptions for screen readers and search.`
      : "No images found on the first page load.",
    weight: 1,
  });

  const fast = facts.responseMs < 800;
  const ok = facts.responseMs < 1800;
  add({
    id: "speed",
    label: "Server response",
    status: fast ? "pass" : ok ? "warn" : "fail",
    detail: `Your server answered in ${(facts.responseMs / 1000).toFixed(1)}s${
      fast ? ", which is quick." : ok ? ". Under 0.8s feels instant." : ". That's slow enough that visitors may leave."
    }`,
    weight: 2,
  });

  return out;
}

/** Weighted score from 0 to 100: pass = full weight, warn = half. */
export function scoreChecks(checks: CheckResult[]): number {
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.reduce(
    (s, c) => s + (c.status === "pass" ? c.weight : c.status === "warn" ? c.weight / 2 : 0),
    0,
  );
  return total ? Math.round((got / total) * 100) : 0;
}

/** A plain-language summary used when no AI model is configured. */
export function fallbackSummary(host: string, checks: CheckResult[], score: number): string {
  const misses = checks.filter((c) => c.status !== "pass");
  if (!misses.length) {
    return `${host} covers the basics well. The next gains usually come from faster pages, more reviews and answering after hours.`;
  }
  const top = misses
    .sort((a, b) => (a.status === "fail" ? 0 : 1) - (b.status === "fail" ? 0 : 1) || b.weight - a.weight)
    .slice(0, 3)
    .map((c) => c.label.toLowerCase());
  return `${host} scores ${score} out of 100 on the basics that win local customers. The biggest openings: ${top.join(", ")}.`;
}
