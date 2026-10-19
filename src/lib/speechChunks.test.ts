import { describe, expect, it } from "vitest";
import { splitForSpeech } from "./speechChunks";

describe("splitForSpeech", () => {
  it("speaks short replies in one piece", () => {
    expect(splitForSpeech("Sure. Happy to help with that.")).toEqual(["Sure. Happy to help with that."]);
  });

  it("returns nothing for empty text", () => {
    expect(splitForSpeech("   ")).toEqual([]);
  });

  it("starts with a short first chunk and keeps every word", () => {
    const reply =
      "Great question about missed calls. Most local businesses lose a few customers a week to voicemail. " +
      "An assistant can answer right away, take the details, and pass the rest to your team. " +
      "We would set it up around your hours and your services, then you review how it sounds before it goes live.";
    const chunks = splitForSpeech(reply);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBeLessThan(reply.length / 2);
    expect(chunks.join(" ")).toBe(reply);
  });

  it("does not split on decimals or lowercase continuations", () => {
    const reply =
      "The check covers 12.5 points of the basics that win local customers, and it takes about twenty seconds to run on your homepage. " +
      "After that you get a plain-English summary of what is working and what could be better for your business.";
    const chunks = splitForSpeech(reply);
    expect(chunks.join(" ")).toBe(reply);
    for (const chunk of chunks) expect(chunk).not.toMatch(/^\d{1,2}\s/);
  });

  it("caps the number of requests", () => {
    const sentence = "This is a reasonably long sentence that keeps the reply going for a while. ";
    const chunks = splitForSpeech(sentence.repeat(30), { maxChunks: 3 });
    expect(chunks.length).toBeLessThanOrEqual(3);
  });

  it("leaves a single huge sentence alone", () => {
    const reply = `${"word ".repeat(80).trim()}. Short end.`;
    expect(splitForSpeech(reply)).toEqual([reply]);
  });
});
