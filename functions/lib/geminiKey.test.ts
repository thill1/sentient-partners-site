import { describe, expect, it } from "vitest";
import { geminiKey, groqKey } from "./geminiKey";

describe("geminiKey", () => {
  it("prefers the live key for live voice", () => {
    expect(geminiKey({ GEMINI_LIVE_API_KEY: "live", GEMINI_API_KEY: "g" }, { live: true })).toBe("live");
    expect(geminiKey({ GEMINI_LIVE_API_KEY: "live", GEMINI_API_KEY: "g" })).toBe("g");
  });
  it("accepts a legacy API_KEY only when it is not a Groq key", () => {
    expect(geminiKey({ API_KEY: "AIza-x" }, { live: true })).toBe("AIza-x");
    expect(geminiKey({ API_KEY: "gsk_abc" }, { live: true })).toBe("");
    expect(groqKey({ API_KEY: "gsk_abc" })).toBe("gsk_abc");
    expect(groqKey({ API_KEY: "AIza-x" })).toBe("");
  });
});
