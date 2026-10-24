/* global navigator, Blob, fetch, document, location */
// Cookieless click counts for Insights pages (same endpoint as the main site).
(() => {
  const send = (event, label) => {
    const body = JSON.stringify({ event, label: String(label).toLowerCase().replace(/[^a-z0-9._/-]+/g, "-").slice(0, 60) });
    try {
      if (!navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }))) throw 0;
    } catch {
      fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
    }
  };
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (href.startsWith("tel:")) send("phone", location.pathname);
    else if (/cal\.com\//.test(href)) send("cal_link", location.pathname);
    else if (href.endsWith("capabilities.pdf")) send("capabilities_pdf", location.pathname);
  });
})();
