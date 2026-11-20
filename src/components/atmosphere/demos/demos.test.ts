import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { relayScreens } from "./relayScreens";

const DEMO_SOURCES = [
  "src/components/atmosphere/InteractiveDemos.tsx",
  "src/components/atmosphere/demos/RelayWalkthrough.tsx",
  "src/components/atmosphere/demos/VoiceExample.tsx",
  "src/components/atmosphere/demos/relayScreens.ts",
];
const read = (path: string) => readFileSync(path, "utf8");

describe("Relay walkthrough", () => {
  it("shows nine screens with signature capture ninth, right after Documents", () => {
    expect(relayScreens.map((screen) => screen.file)).toEqual([
      "relay-today",
      "relay-jobs",
      "relay-job",
      "relay-calendar",
      "relay-customers",
      "relay-customer",
      "relay-more",
      "relay-documents",
      "relay-sign",
    ]);
    expect(relayScreens[7].title).toBe("Documents");
    expect(relayScreens[8].title).toBe("Signature capture");
    for (const screen of relayScreens) {
      expect(existsSync(`public/showcase/relay/${screen.file}.webp`)).toBe(true);
    }
  });

  it("steps with the left and right arrow keys without wrapping past the last screen", () => {
    const source = read("src/components/atmosphere/demos/RelayWalkthrough.tsx");
    expect(source).toMatch(/ArrowLeft: \(current\) => Math\.max\(0, current - 1\)/);
    expect(source).toMatch(/ArrowRight: \(current\) => Math\.min\(last, current \+ 1\)/);
    expect(source).toMatch(/event\.preventDefault\(\)/);
    expect(source).toMatch(/input, textarea, select, \[contenteditable\]/);
    expect(source).toMatch(/document\.addEventListener\("keydown"/);
    expect(source).toMatch(/document\.removeEventListener\("keydown"/);
  });

  it("prefetches only the next screen after the current one loads", () => {
    const source = read("src/components/atmosphere/demos/RelayWalkthrough.tsx");
    expect(source).toMatch(/onLoad=\{prefetchNext\}/);
    expect(source).toMatch(/relayScreens\[step \+ 1\]/);
    expect(source).toMatch(/new Image\(\)/);
    expect(source).not.toMatch(/\bfetch\(/);
  });

  it("links the homepage showcase to the inline walkthrough", () => {
    const showcase = read("src/components/atmosphere/RelayShowcase.tsx");
    const link = showcase.match(/<a className="text-link" href="([^"]+)">\s*Walk through the screens/);
    expect(link?.[1]).toBe("#interactive-demos");
    expect(showcase).not.toMatch(/\/demos\/#relay/);
    expect(showcase).toMatch(/Ask about Sentient Relay/);
  });

  it("labels Relay as in pilot", () => {
    expect(read("src/components/atmosphere/demos/RelayWalkthrough.tsx")).toMatch(/In pilot/);
    expect(read("src/components/atmosphere/InteractiveDemos.tsx")).toMatch(/In pilot/);
  });
});

describe("demo copy and behaviour", () => {
  it("keeps to the site's content rules", () => {
    for (const path of DEMO_SOURCES) {
      const source = read(path);
      expect(source, path).not.toMatch(/troyhill@|AI[- ]First Agency|\baudit/i);
      expect(source, path).not.toMatch(/guarantee|response time|within \d+ (minutes|hours)/i);
    }
  });

  it("offers the 20-minute intro call and labels the voice demo as scripted", () => {
    expect(read("src/components/atmosphere/InteractiveDemos.tsx")).toMatch(/20-minute intro call/);
    const voice = read("src/components/atmosphere/demos/VoiceExample.tsx");
    expect(voice).toMatch(/Scripted example/);
    expect(voice).toMatch(/\bAI\b/);
  });

  it("never calls the network or the microphone from the demos", () => {
    for (const path of DEMO_SOURCES) {
      const source = read(path);
      expect(source, path).not.toMatch(/\bfetch\(|\/api\/|getUserMedia|WebSocket|AudioContext/);
    }
  });
});
