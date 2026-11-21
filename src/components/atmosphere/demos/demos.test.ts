import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pageFor } from "../../../App";
import { RELAY_SCREENS, RELAY_STATUS } from "./relayScreens";
import { VOICE_EXAMPLE } from "./voiceExample";
import { RelayWalkthrough } from "./RelayWalkthrough";
import { SiteVoiceExample } from "./SiteVoiceExample";
import { DemosPage } from "./DemosPage";
import { RelayShowcase } from "../RelayShowcase";
import { Capabilities } from "../Capabilities";

const BANNED = /troyhill@|AI-First Agency|\baudit\b|in development/i;

describe("Relay walkthrough screens", () => {
  it("puts signature capture ninth, immediately after Documents", () => {
    expect(RELAY_SCREENS).toHaveLength(9);
    expect(RELAY_SCREENS.map((screen) => screen.id)).toEqual([
      "today",
      "jobs",
      "job",
      "calendar",
      "customers",
      "customer",
      "more",
      "documents",
      "sign",
    ]);
    expect(RELAY_SCREENS[7].title).toBe("Documents");
    expect(RELAY_SCREENS[8].title).toBe("Signature");
    expect(RELAY_SCREENS[8].file).toBe("relay-sign");
    for (const screen of RELAY_SCREENS) {
      expect(existsSync(`public/showcase/relay/${screen.file}.webp`)).toBe(true);
    }
  });

  it("describes Relay as in pilot and stays on sample-data facts", () => {
    expect(RELAY_STATUS).toBe("In pilot");
    const copy = JSON.stringify(RELAY_SCREENS);
    expect(copy).not.toMatch(BANNED);
    expect(copy).not.toMatch(/\d+%|response time|pilot with|signed up|customers include/i);
  });
});

describe("site voice example", () => {
  it("is a labeled script about this site's assistant, with no live-call claims", () => {
    expect(VOICE_EXAMPLE.label).toMatch(/example/i);
    expect(VOICE_EXAMPLE.disclosure).toMatch(/script/i);
    expect(VOICE_EXAMPLE.lines.some((line) => line.who === "assistant")).toBe(true);
    expect(VOICE_EXAMPLE.lines.some((line) => line.who === "visitor")).toBe(true);
    const copy = JSON.stringify(VOICE_EXAMPLE);
    expect(copy).toMatch(/hello@sentientpartners\.ai/);
    expect(copy).toMatch(/20-minute introductory call/);
    expect(copy).toMatch(/\bAI\b/);
    expect(copy).not.toMatch(BANNED);
    expect(copy).not.toMatch(/within \d+|minutes|by \d|guarantee|response time/i);
  });
});

describe("demo markup", () => {
  it("renders one Relay screen and names signature as step 9", () => {
    const html = renderToString(createElement(RelayWalkthrough));
    expect(html).toMatch(/in pilot/i);
    expect(html).not.toMatch(BANNED);
    expect(html.match(/showcase\/relay\//g)).toHaveLength(1);
    expect(html).toContain("relay-today.webp");
    expect(html.indexOf("Documents")).toBeLessThan(html.indexOf("Signature"));
    expect(html).toContain("9");
  });

  it("shows the voice example at rest, with a link to the live assistant and no API call", () => {
    const html = renderToString(createElement(SiteVoiceExample));
    expect(html).toMatch(/example/i);
    expect(html).toContain("Play the example");
    expect(html).toContain("Open the live assistant");
    expect(html).not.toContain("Where would you suggest we start");
    expect(html).not.toMatch(/\/api\/|generativelanguage|live-token/);
    expect(html).not.toMatch(BANNED);
  });

  it("keeps the demos page to the first Relay image", () => {
    const html = renderToString(createElement(DemosPage));
    expect(html.match(/showcase\/relay\//g)).toHaveLength(1);
    expect(html).toContain('href="/#capabilities"');
    expect(html).toContain("a 20-minute introductory call");
    expect(html).toContain("Book a call");
    expect(html).not.toMatch(BANNED);
  });

  it("does not call a paid API from the demo modules", () => {
    const sources = [
      "src/components/atmosphere/demos/RelayWalkthrough.tsx",
      "src/components/atmosphere/demos/SiteVoiceExample.tsx",
      "src/components/atmosphere/demos/DemosPage.tsx",
      "src/components/atmosphere/demos/voiceExample.ts",
    ]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    expect(sources).not.toMatch(/fetch\(|\/api\/|liveVoice|@google\/genai|gemini/i);
  });
});

describe("where the demos are linked", () => {
  it("routes /demos and links it from the Relay showcase", () => {
    expect(pageFor("/demos")).toBe("demos");
    expect(pageFor("/demos/")).toBe("demos");
    const html = renderToString(createElement(RelayShowcase));
    expect(html).toContain('href="/demos/#relay"');
    expect(html).toMatch(/in pilot/i);
    const capabilities = renderToString(createElement(Capabilities));
    expect(capabilities).toContain('href="/demos/"');
  });
});
