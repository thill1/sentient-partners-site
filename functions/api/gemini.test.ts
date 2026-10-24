import { describe, expect, it } from "vitest";
import { CHAT_DEADLINE_MS, TIMEOUT_REPLY, thinkingFor } from "./gemini";

describe("chat reliability", () => {
  it("turns thinking off for Flash models", () => {
    expect(thinkingFor("gemini-2.5-flash")).toEqual({ thinkingConfig: { thinkingBudget: 0 } });
    expect(thinkingFor("gemini-3.8-flash")).toEqual({ thinkingConfig: { thinkingLevel: "low" } });
  });
  it("caps a request at about 20 s and falls back to the booking link and hello@", () => {
    expect(CHAT_DEADLINE_MS).toBeLessThanOrEqual(20_000);
    expect(TIMEOUT_REPLY).toContain("cal.com/sentient-partners-strategy/introductory-call");
    expect(TIMEOUT_REPLY).toContain("hello@sentientpartners.ai");
  });
});
