import { describe, expect, it } from "vitest";
import { isBargeIn, nextChunkStart, rms } from "./liveVoice";

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

describe("playback scheduling", () => {
  it("plays chunks back to back while the queue is full", () => {
    expect(nextChunkStart(5.3, 5.0, 0.12)).toBe(5.3);
  });
  it("re-buffers only when the queue ran dry", () => {
    expect(nextChunkStart(4.9, 5.0, 0.12)).toBeCloseTo(5.12);
    expect(nextChunkStart(0, 5.0, 0.12)).toBeCloseTo(5.12);
  });
});
