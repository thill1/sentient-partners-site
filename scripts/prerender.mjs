import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import Beasties from "beasties";

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
  const critical = await beasties.process(
    shell.replace('<div id="root"></div>', `<div id="root">${firstScreen}</div>`),
  );
  const head = critical.slice(0, critical.indexOf("</head>"));
  const html =
    head +
    shell.slice(shell.indexOf("</head>")).replace(
      '<div id="root"></div>',
      `<div id="root">${app}</div>`,
    );
  await writeFile("dist/index.html", html);

  // /tools/: same shell, its own markup, title and description.
  const tools = renderToString(createElement(App, { path: "/tools/" }));
  const TITLE = "Free tools for growing businesses | Sentient Partners";
  const DESC =
    "Free tools from Sentient Partners. Start with a website check: a plain-English look at phones, search, speed and booking, in about 20 seconds.";
  const homeTitle = /Sentient Partners \| Business Strategy\. Intelligent Systems\. Measurable Results\./g;
  const toolsHtml = html
    .replace(`<div id="root">${app}</div>`, `<div id="root">${tools}</div>`)
    .replace(homeTitle, TITLE)
    .replace(/(<meta\s+(?:name="description"|property="og:description"|name="twitter:description")\s+content=")[^"]*"/g, `$1${DESC}"`)
    .replace(/(<link rel="canonical" href=")https:\/\/sentientpartners\.ai\/"/, "$1https://sentientpartners.ai/tools/\"")
    .replace(/(<meta property="og:url" content=")https:\/\/sentientpartners\.ai\/"/, "$1https://sentientpartners.ai/tools/\"");
  if (!toolsHtml.includes(TITLE) || !toolsHtml.includes(DESC) || !toolsHtml.includes('canonical" href="https://sentientpartners.ai/tools/"')) {
    throw new Error("prerender: /tools/ head replacements did not apply");
  }
  await mkdir("dist/tools", { recursive: true });
  await writeFile("dist/tools/index.html", toolsHtml);
} finally {
  await server.close();
}
