/** Cookieless first-party click counts (see functions/api/track.ts). */
export type TrackEvent =
  | "book_call" | "phone" | "chat_open" | "chat_send" | "voice_start"
  | "cal_link" | "tool_use" | "template_download" | "capabilities_pdf";

const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9._/-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export function track(event: TrackEvent, label = ""): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ event, label: slug(label) });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/track", blob)) {
      void fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => undefined);
    }
  } catch {
    // never break a click
  }
}

const toolOf = (path: string) => (path.match(/^\/tools\/([^/]+)/)?.[1] ?? "");

/** One listener for links: phone, Cal.com, templates and the capabilities PDF. */
export function installClickTracking(): void {
  if (typeof document === "undefined") return;
  const usedTools = new Set<string>();
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      const where = location.pathname;
      if (href.startsWith("tel:")) track("phone", a.closest(".action-dock") ? "dock" : where);
      // A prevented Cal.com click opened the booking modal (counted as book_call).
      else if (/cal\.com\//.test(href)) { if (!e.defaultPrevented) track("cal_link", where); }
      else if (href.includes("/templates/")) track("template_download", href.split("/").pop() || "");
      else if (href.endsWith("capabilities.pdf")) track("capabilities_pdf", where);
    },
  );
  // Tool usage: first input on a tool page or the website check, once per page view.
  const onUse = (e: Event) => {
    const el = e.target as Element | null;
    const tool = el?.closest?.("#website-check") ? "website-check" : el?.closest?.(".tool-page") ? toolOf(location.pathname) : "";
    if (!tool || usedTools.has(tool)) return;
    usedTools.add(tool);
    track("tool_use", tool);
  };
  document.addEventListener("change", onUse, { capture: true });
  document.addEventListener("submit", onUse, { capture: true });
}
