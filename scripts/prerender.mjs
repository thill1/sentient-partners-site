import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { readFile, writeFile } from "node:fs/promises";
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
} finally {
  await server.close();
}
