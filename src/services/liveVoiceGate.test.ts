import { describe, expect, it } from "vitest";
import { isBargeIn, rms } from "./liveVoice";

describe("echo gate", () => {
  it("measures level", () => {
    expect(rms(new Float32Array([0.5, -0.5]))).toBeCloseTo(0.5);
    expect(rms(new Float32Array(0))).toBe(0);
  });
  it("drops the assistant's own echo and keeps a visitor talking over it", () => {
    expect(isBargeIn(0.02, 0.2)).toBe(false); // faint leak from the speaker
    expect(isBargeIn(0.1, 0.2)).toBe(false); // echo below 60% of playback
    expect(isBargeIn(0.25, 0.2)).toBe(true); // visitor speaking up
    expect(isBargeIn(0.02, 0)).toBe(false); // room noise floor
  });
});
