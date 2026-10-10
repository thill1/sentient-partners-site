import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { readFile, writeFile } from "node:fs/promises";

// Ship crawlable, usable HTML before JavaScript or WebGL starts.
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { default: App } = await server.ssrLoadModule("/src/App.tsx");
  let html = await readFile("dist/index.html", "utf8");
  // Inline the small compressed stylesheet so the first paint needs no CSS round trip.
  const stylesheets = [
    ...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/g),
  ];
  for (const [tag, url] of stylesheets) {
    const css = await readFile(`dist${url}`, "utf8");
    html = html.replace(tag, `<style>${css}</style>`);
  }
  await writeFile(
    "dist/index.html",
    html.replace(
      '<div id="root"></div>',
      `<div id="root">${renderToString(createElement(App))}</div>`,
    ),
  );
} finally {
  await server.close();
}
