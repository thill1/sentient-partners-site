// Run against a local production preview; all API calls are intercepted.
// node scripts/verify-demos.mjs [--browser /path/to/chrome] [--axe-module /path/to/axe/index.mjs]
/* global window, navigator, document, getComputedStyle, innerWidth */
import assert from "node:assert/strict";
import process from "node:process";
import console from "node:console";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL, URL } from "node:url";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const option = (name) => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const base = option("--url") ?? "http://127.0.0.1:4175";
assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1):\d+\/?$/, "Use a local preview only");
const axeModule = option("--axe-module");
const AxeBuilder = axeModule ? (await import(pathToFileURL(axeModule).href)).default : null;
const browser = await chromium.launch({ headless: true, executablePath: option("--browser") });
const output = "docs/demos-review";
// Isolate the reviewed section: fixed site chrome and decorative fog otherwise
// repeat across tall element captures. The product UI is unchanged.
const captureStyle = ".site-header, .action-dock, .skip-link, .page-atmosphere { visibility: hidden !important; }";
await mkdir(output, { recursive: true });
const checks = [];
try {
  for (const width of [375, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const requests = [];
    const errors = [];
    await context.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      requests.push(path);
      await route.fulfill(path === "/api/settings" ? { json: {} } : { status: 204 });
    });
    const page = await context.newPage();
    const chunks = [];
    page.on("request", (request) => {
      if (/\/(RelayWalkthrough|VoiceExample)-[^/]+\.js/.test(request.url())) chunks.push(request.url());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.__demoMicRequests = 0;
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => {
        window.__demoMicRequests++;
        return Promise.reject(new Error("Microphone disabled during demo verification"));
      };
    });
    await page.goto(base, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(chunks.length, 0, "Demo chunks stay unloaded on initial page load");
    const section = page.locator("#interactive-demos");
    await section.scrollIntoViewIfNeeded();
    assert.equal(await section.locator("h2").evaluate((el) => getComputedStyle(el).color), "rgb(16, 36, 52)", "Paper heading uses ink");
    assert.equal(await section.locator(".demos-footer a").evaluate((el) => getComputedStyle(el).color), "rgb(16, 36, 52)", "Paper CTA uses ink");
    assert.equal(chunks.length, 0, "Scrolling does not start a demo");
    const relay = section.getByRole("button", { name: "Explore Sentient Relay" });
    await relay.focus();
    await page.keyboard.press("Enter");
    await section.getByRole("heading", { name: "Sentient Relay In pilot" }).waitFor();
    assert.equal(chunks.filter((url) => url.includes("RelayWalkthrough-")).length, 1);
    assert.equal(chunks.filter((url) => url.includes("VoiceExample-")).length, 0);
    const screens = section.getByRole("list", { name: "Relay walkthrough screens" }).getByRole("button");
    assert.equal(await screens.count(), 9);
    assert.match(await screens.nth(7).innerText(), /Documents/);
    assert.match(await screens.nth(8).innerText(), /Signature capture/);
    assert.equal(await section.getByRole("button", { name: "Previous", exact: true }).isDisabled(), true);
    const imageReady = async () => {
      await section.locator(".demo-phone img").evaluate(async (image) => { await image.decode(); });
    };
    await imageReady();
    await section.screenshot({ path: `${output}/relay-${width}.png`, animations: "disabled", style: captureStyle });
    for (let step = 2; step <= 9; step++) {
      await section.getByRole("button", { name: "Next screen", exact: true }).click();
      await section.getByText(`Screen ${step} of 9`, { exact: true }).waitFor();
      await imageReady();
    }
    assert.match(await section.locator(".demo-phone img").getAttribute("src"), /relay-sign/);
    await section.screenshot({ path: `${output}/signature-${width}.png`, animations: "disabled", style: captureStyle });
    await section.getByRole("button", { name: "Previous", exact: true }).click();
    assert.match(await section.locator(".demo-phone img").getAttribute("src"), /relay-documents/);
    await section.getByRole("button", { name: "Next screen", exact: true }).click();
    await section.getByRole("button", { name: "Start again", exact: true }).click();
    await section.getByText("Screen 1 of 9", { exact: true }).waitFor();
    // Arrow keys step through screens: Left stops on the first, Right stops on the last.
    await screens.nth(0).focus();
    await page.keyboard.press("ArrowLeft");
    await section.getByText("Screen 1 of 9", { exact: true }).waitFor();
    await page.keyboard.press("ArrowRight");
    await section.getByText("Screen 2 of 9", { exact: true }).waitFor();
    await page.keyboard.press("End");
    await section.getByText("Screen 9 of 9", { exact: true }).waitFor();
    await page.keyboard.press("ArrowRight");
    await section.getByText("Screen 9 of 9", { exact: true }).waitFor();
    assert.match(await section.locator(".demo-phone img").getAttribute("src"), /relay-sign/, "ArrowRight does not wrap");
    await page.keyboard.press("ArrowLeft");
    await section.getByText("Screen 8 of 9", { exact: true }).waitFor();
    await page.keyboard.press("Home");
    await section.getByText("Screen 1 of 9", { exact: true }).waitFor();
    // Direct screen selection works from the keyboard, too.
    await screens.nth(7).focus();
    await page.keyboard.press("Space");
    await section.getByText("Screen 8 of 9", { exact: true }).waitFor();
    if (AxeBuilder) {
      const result = await new AxeBuilder({ page }).include("#interactive-demos").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      assert.deepEqual(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), [], "Relay accessibility");
    }
    await section.getByRole("button", { name: "Read the voice example" }).click();
    await section.getByRole("heading", { name: "A conversation with Ask Sentient." }).waitFor();
    assert.equal(chunks.filter((url) => url.includes("VoiceExample-")).length, 1);
    const transcript = section.getByRole("list", { name: "Scripted website voice conversation" }).getByRole("listitem");
    assert.equal(await transcript.count(), 1);
    await section.getByRole("button", { name: "Next line", exact: true }).click();
    assert.equal(await transcript.count(), 2);
    await section.getByRole("button", { name: "Read full example", exact: true }).click();
    assert.equal(await transcript.count(), 7);
    await section.screenshot({ path: `${output}/voice-${width}.png`, animations: "disabled", style: captureStyle });
    if (AxeBuilder) {
      const result = await new AxeBuilder({ page }).include("#interactive-demos").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      assert.deepEqual(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), [], "Voice example accessibility");
    }
    await section.getByRole("button", { name: "Read again", exact: true }).click();
    assert.equal(await transcript.count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "No horizontal page overflow");
    assert.equal(await section.getByRole("link", { name: "Book a 20-minute intro call", exact: true }).getAttribute("href"), "https://cal.com/sentient-partners-strategy/introductory-call");
    await section.getByRole("link", { name: "Try the real voice assistant" }).click();
    const dialog = page.getByRole("dialog", { name: "Ask Sentient" });
    await dialog.waitFor();
    await dialog.getByRole("button", { name: "Start with voice" }).click();
    await dialog.getByRole("tab", { name: "Voice", exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__demoMicRequests), 0);
    assert.deepEqual(requests.filter((path) => /voice|live|gemini|groq|demo-chat|booking|leads/.test(path)), [], "No provider, booking or lead API calls");
    assert.deepEqual(errors, [], "No browser errors");
    const pdf = await page.request.get(`${base}/capabilities.pdf`);
    assert.equal(pdf.status(), 200);
    assert.match(pdf.headers()["content-type"], /application\/pdf/);
    assert.equal(createHash("sha256").update(await pdf.body()).digest("hex"), createHash("sha256").update(readFileSync("public/capabilities.pdf")).digest("hex"));
    checks.push({ width, relayScreens: 9, signatureScreen: 9, voiceLines: 7, lazyChunks: true, microphoneRequests: 0, paidApiRequests: 0, browserErrors: errors, accessibility: AxeBuilder ? "WCAG 2.1 AA: zero violations in both demos" : "keyboard and semantic checks", pdf: "HTTP 200; identical SHA-256" });
    await context.close();
  }
  // Recovery paths and ordinary motion are functional checks, without captures.
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route("**/api/**", (route) => route.fulfill({ json: {} }));
  const page = await context.newPage();
  await page.route("**/relay-today.webp*", (route) => route.fulfill({ status: 404 }));
  await page.goto(`${base}/#interactive-demos`, { waitUntil: "networkidle" });
  const section = page.locator("#interactive-demos");
  await section.getByRole("button", { name: "Explore Sentient Relay" }).click();
  await section.getByText("This screen could not load.", { exact: false }).waitFor();
  await section.getByRole("button", { name: "Next screen", exact: true }).click();
  await section.locator(".demo-phone img").evaluate(async (image) => { await image.decode(); });
  assert.equal(await section.getByText("Screen 2 of 9", { exact: true }).count(), 1);
  await context.close();

  const failedChunk = await browser.newContext({ reducedMotion: "reduce" });
  await failedChunk.route("**/api/**", (route) => route.fulfill({ json: {} }));
  await failedChunk.route("**/RelayWalkthrough-*.js", (route) => route.abort());
  const failedPage = await failedChunk.newPage();
  await failedPage.goto(base, { waitUntil: "networkidle" });
  const failedSection = failedPage.locator("#interactive-demos");
  await failedSection.getByRole("button", { name: "Explore Sentient Relay" }).click();
  await failedSection.getByRole("alert").waitFor();
  await failedSection.getByRole("link", { name: "Reload the page to try again." }).waitFor();
  await failedSection.getByRole("button", { name: "Read the voice example" }).click();
  await failedSection.getByRole("button", { name: "Next line", exact: true }).waitFor();
  await failedChunk.close();
  checks.push({ recovery: "Image failure offers fallback; next screen works. Chunk failure offers reload; other demo works.", motion: "Relay navigation passed with ordinary motion enabled." });
  await writeFile(`${output}/checks.json`, JSON.stringify(checks, null, 2) + "\n");
  console.log(JSON.stringify(checks, null, 2));
} finally {
  await browser.close();
}
