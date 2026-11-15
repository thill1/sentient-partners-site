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

  // Critical CSS: header, hero, and the action dock (visible on first paint).
  // The old cut looked for a perspective section that is no longer rendered,
  // so the inline block had grown to the CSS for the whole page.
  const outcomeAt = app.search(/<section[^>]*class="[^"]*outcomes-v2/);
  if (outcomeAt < 0) {
    throw new Error(
      "prerender: outcomes-v2 section missing; refusing to inline CSS for the whole page",
    );
  }
  const firstScreen =
    app.slice(0, outcomeAt) +
    `<div class="action-dock is-shown"><a class="dock-book">Book a call</a><button class="dock-ask" type="button">Ask Sentient</button><a class="dock-call">Call</a></div>`;
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
  const styles = html.match(/<style[\s\S]*?<\/style>/g) ?? [];
  const largestStyle = styles.reduce((n, block) => Math.max(n, block.length), 0);
  if (largestStyle > 55000) {
    throw new Error(
      `prerender: homepage critical CSS is ${largestStyle} bytes; the first-screen cut did not apply`,
    );
  }
  if (!html.includes("cormorant-garamond-normal-500")) {
    throw new Error("prerender: homepage is missing the headline font");
  }

  // Tool pages: same shell, their own markup, title and description.
  const PAGES = [
    {
      path: "/demos/",
      title: "Interactive demos | Sentient Partners",
      desc: "Click through Sentient Relay, in pilot, and play a scripted example of the voice assistant on this site. The example does not start a live conversation.",
    },
    {
      path: "/tools/",
      title: "Free tools for growing businesses | Sentient Partners",
      desc: "Free tools from Sentient Partners: website check, missed-call calculator, AI readiness check, time-back estimator and reputation snapshot.",
    },
    {
      path: "/tools/missed-call-calculator/",
      title: "Missed-call calculator | Sentient Partners",
      desc: "Estimate what unanswered calls may cost your business each month and year, using your own call volume, booking rate and average job value.",
    },
    {
      path: "/tools/ai-readiness/",
      title: "AI readiness check | Sentient Partners",
      desc: "Nine quick questions on calls, booking, follow-up, invoicing and data. Get a score out of 100 and three practical next steps.",
    },
    {
      path: "/tools/time-back/",
      title: "Time-back estimator | Sentient Partners",
      desc: "Estimate the hours a week and a year you could get back from scheduling, invoicing, follow-ups and retyping, using your own numbers.",
    },
    {
      path: "/tools/reputation/",
      title: "Reputation snapshot | Sentient Partners",
      desc: "A quick self-check of your rating, review count, recency and replies. Get a score out of 100 and three practical next steps.",
    },
  ];
  const homeTitle = /Sentient Partners \| Business Strategy\. Intelligent Systems\. Measurable Results\./g;
  for (const page of PAGES) {
    const body = renderToString(createElement(App, { path: page.path }));
    const url = `https://sentientpartners.ai${page.path}`;
    const pageHead = await criticalHead(body);
    const out = (pageHead + html.slice(html.indexOf("</head>")))
      .replace(`<div id="root">${app}</div>`, () => `<div id="root">${body}</div>`)
      .replace(homeTitle, page.title)
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
