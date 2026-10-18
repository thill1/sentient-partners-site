/* global process, console */
// Build step: prerenders /insights and /insights/<slug>/ as static HTML in dist.
// Production includes approved issues only; INSIGHTS_INCLUDE_DRAFTS=1 adds drafts.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";
import { BOOKING_URL, SITE, includeDrafts, loadIssues } from "./lib.mjs";

const OUT = process.argv[2] || "dist";
const drafts = includeDrafts();
const issues = loadIssues("content/insights", drafts);

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const longDate = (d) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
const pad = (n) => String(n).padStart(2, "0");
const draftTag = (i) => (i.status === "draft" ? '<span class="draft-tag">Draft</span>' : "");

const FONTS = [
  ["Cormorant Garamond", "normal", 400, "cormorant-garamond-normal-400"],
  ["Cormorant Garamond", "normal", 500, "cormorant-garamond-normal-500"],
  ["Cormorant Garamond", "italic", 400, "cormorant-garamond-italic-400"],
  ["Inter", "normal", 400, "inter-normal-400"],
  ["Inter", "normal", 500, "inter-normal-500"],
  ["Inter", "normal", 600, "inter-normal-600"],
]
  .map(([f, s, w, file]) => `@font-face{font-family:"${f}";font-style:${s};font-weight:${w};font-display:swap;src:url("/fonts/${file}.woff2") format("woff2")}`)
  .join("");

function page({ title, description, path, type = "website", jsonLd, body, noindex }) {
  const url = `${SITE}${path}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
${noindex ? '<meta name="robots" content="noindex">\n' : ""}<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Sentient Partners">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#081536">
<link rel="icon" href="/favicon.ico">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/cormorant-garamond-normal-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/inter-normal-400.woff2" as="font" type="font/woff2" crossorigin>
<style>${FONTS}</style>
<link rel="stylesheet" href="/insights/insights.css">
<link rel="stylesheet" href="/insights/signup-band.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>\n` : ""}</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="ins-header">
  <a class="ins-brand" href="/" aria-label="Sentient Partners home">
    <img src="/atmosphere/sp-monogram-white.png" alt="" width="22" height="36">
    <span>Sentient Partners</span>
  </a>
  <a class="ins-home" href="/">Home</a>
</header>
<main id="main">
${body}
</main>
<section class="signup-band" aria-labelledby="signup-title">
  <div class="signup-inner">
    <div>
      <p class="signup-eyebrow">Insights</p>
      <h2 id="signup-title" class="signup-title">A short, practical note for local business owners, every other week.</h2>
    </div>
    <form class="signup-form" novalidate>
      <label for="signup-email" class="signup-label">Email address</label>
      <div class="signup-row">
        <input id="signup-email" type="email" name="email" autocomplete="email" required aria-describedby="signup-msg">
        <input type="text" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true" class="signup-honey">
        <button type="submit">Subscribe</button>
      </div>
      <p id="signup-msg" class="signup-msg" role="alert"></p>
    </form>
  </div>
</section>
<footer class="ins-footer">
  <span>© ${new Date().getFullYear()} Sentient Partners · Auburn, California</span>
  <nav aria-label="Footer">
    <a href="/">Home</a>
    ${issues.length ? '<a href="/insights/">Insights</a>' : ""}
    <a href="mailto:hello@sentientpartners.ai">hello@sentientpartners.ai</a>
    <a href="/privacy.html">Privacy</a>
  </nav>
</footer>
<script src="/insights/signup.js" defer></script>
</body>
</html>
`;
}

function renderBody(md) {
  let html = marked.parse(md, { gfm: true });
  // Sources: everything from the "Sources" heading on, in a quieter block.
  const idx = html.search(/<h2[^>]*>Sources<\/h2>/);
  if (idx >= 0) html = `${html.slice(0, idx)}<section class="sources">${html.slice(idx)}</section>`;
  return html;
}

const dir = join(OUT, "insights");
mkdirSync(dir, { recursive: true });
for (const f of ["insights.css", "signup-band.css", "signup.js"]) copyFileSync(join("insights", f), join(dir, f));

const cards = issues
  .map(
    (i) => `<li class="card"><a href="/insights/${i.slug}/">
  <div class="card-meta">Issue ${pad(i.issue)}${draftTag(i)}<span>${longDate(i.date)}${i.reading_minutes ? ` · ${i.reading_minutes} min read` : ""}</span></div>
  <div><h2>${esc(i.title)}</h2><p>${esc(i.summary)}</p><span class="read">Read issue ${pad(i.issue)}</span></div>
</a></li>`,
  )
  .join("\n");

writeFileSync(
  join(dir, "index.html"),
  page({
    title: "Insights | Sentient Partners",
    description: "A short, practical note for local business owners, every other week.",
    path: "/insights/",
    noindex: !issues.some((i) => i.status === "approved"),
    body: `<section class="archive">
  <p class="eyebrow">Insights</p>
  <h1>Notes for local business owners</h1>
  <p class="lede">A short, practical note for local business owners, every other week.</p>
  ${issues.length ? `<ol class="cards" reversed>${cards}</ol>` : `<div class="soon"><h2>First issue coming soon</h2><p>Sign up below and we'll send it when it's ready.</p></div>`}
</section>`,
  }),
);

for (const i of issues) {
  const path = `/insights/${i.slug}/`;
  mkdirSync(join(OUT, path), { recursive: true });
  writeFileSync(
    join(OUT, path, "index.html"),
    page({
      title: `${i.title} | Sentient Partners Insights`,
      description: i.summary,
      path,
      type: "article",
      noindex: i.status !== "approved",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: i.title,
        description: i.summary,
        datePublished: i.date,
        mainEntityOfPage: `${SITE}${path}`,
        image: `${SITE}${i.hero_image || "/og-image.jpg"}`,
        author: { "@type": "Organization", name: "Sentient Partners", url: SITE },
        publisher: { "@type": "Organization", name: "Sentient Partners", url: SITE },
      },
      body: `<article class="article">
  <p class="eyebrow">Insights · Issue ${pad(i.issue)}${draftTag(i)}</p>
  <h1>${esc(i.title)}</h1>
  <p class="summary">${esc(i.summary)}</p>
  <p class="byline"><time datetime="${i.date}">${longDate(i.date)}</time>${i.reading_minutes ? ` · ${i.reading_minutes} min read` : ""}</p>
  <div class="prose">${renderBody(i.body)}</div>
  <div class="cta"><a href="${BOOKING_URL}">Book a 20-minute introductory call <span aria-hidden="true">↗</span></a></div>
  <a class="back" href="/insights/">← All issues</a>
</article>`,
    }),
  );
}

// Sitemap: approved issues only (and the archive once one exists).
const approved = issues.filter((i) => i.status === "approved");
const smPath = join(OUT, "sitemap.xml");
let sm = readFileSync(smPath, "utf8");
if (approved.length) {
  const urls = [
    `<url><loc>${SITE}/insights/</loc><lastmod>${approved[0].date}</lastmod></url>`,
    ...approved.map((i) => `<url><loc>${SITE}/insights/${i.slug}/</loc><lastmod>${i.date}</lastmod></url>`),
  ].join("");
  sm = sm.replace("</urlset>", `${urls}</urlset>`);
  writeFileSync(smPath, sm);
}
console.log(`insights: ${issues.length} issue(s) built (${approved.length} approved, drafts ${drafts ? "on" : "off"}) into ${OUT}`);
