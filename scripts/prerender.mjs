import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import Beasties from "beasties";
import { PRERENDER_PAGES } from "./prerender-pages.mjs";

// Ship crawlable, usable HTML before JavaScript or WebGL starts.
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { default: App } = await server.ssrLoadModule("/src/App.tsx");
  const shell = await readFile("dist/index.html", "utf8");
  const app = renderToString(createElement(App));

  // Critical CSS: computed against the first screen only (header + hero),
  // so the inline block stays small; the full stylesheet loads without
  // blocking render.
  const cut = app.search(/<section[^>]*class="[^"]*perspective-v2/);
  const firstScreen = cut > 0 ? app.slice(0, cut) : app;
  const beasties = new Beasties({
    path: "dist",
    publicPath: "/",
    preload: "media",
    pruneSource: false,
    inlineFonts: false,
    reduceInlineStyles: false,
    logLevel: "warn",
  });
  // Each page gets critical CSS for its own markup. Tool pages used to reuse the
  // homepage's, so their hero painted unstyled until the async stylesheet
  // arrived and then jumped (CLS 0.82 on /tools/ desktop).
  const criticalHead = async (markup) => {
    const critical = await beasties.process(
      shell.replace('<div id="root"></div>', `<div id="root">${markup}</div>`),
    );
    return critical.slice(0, critical.indexOf("</head>"));
  };
  const head = await criticalHead(firstScreen);
  const html =
    head +
    shell.slice(shell.indexOf("</head>")).replace(
      '<div id="root"></div>',
      `<div id="root">${app}</div>`,
    );
  await writeFile("dist/index.html", html);

  // Every other page: same shell, its own markup, title and description.
  // The list (tools, solutions, Relay) lives in ./prerender-pages.mjs.
  const escapeHtml = (text) =>
    text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const homeTitle = /Sentient Partners \| Business Strategy\. Intelligent Systems\. Measurable Results\./g;
  for (const { path, ...meta } of PRERENDER_PAGES) {
    const page = { path, title: escapeHtml(meta.title), desc: escapeHtml(meta.desc) };
    const body = renderToString(createElement(App, { path: page.path }));
    const url = `https://sentientpartners.ai${page.path}`;
    const pageHead = await criticalHead(body);
    const out = (pageHead + html.slice(html.indexOf("</head>")))
      .replace(`<div id="root">${app}</div>`, () => `<div id="root">${body}</div>`)
      .replace(homeTitle, () => page.title)
      .replace(/(<meta\s+(?:name="description"|property="og:description"|name="twitter:description")\s+content=")[^"]*"/g, (_, a) => `${a}${page.desc}"`)
      .replace(/(<link rel="canonical" href=")https:\/\/sentientpartners\.ai\/"/, (_, a) => `${a}${url}"`)
      .replace(/(<meta property="og:url" content=")https:\/\/sentientpartners\.ai\/"/, (_, a) => `${a}${url}"`);
    if (!out.includes(page.title) || !out.includes(page.desc) || !out.includes(`canonical" href="${url}"`)) {
      throw new Error(`prerender: ${page.path} head replacements did not apply`);
    }
    await mkdir(`dist${page.path}`, { recursive: true });
    await writeFile(`dist${page.path}index.html`, out);
  }
} finally {
  await server.close();
}
