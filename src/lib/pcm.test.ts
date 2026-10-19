import { describe, expect, it } from "vitest";
import {
  base64ToPcm16,
  downsampleTo16k,
  floatToPcm16,
  pcm16ToBase64,
  pcm16ToFloat32,
} from "./pcm";

describe("pcm helpers", () => {
  it("brings 48 kHz audio down to a third of the samples", () => {
    const input = new Float32Array(4800).fill(0.5);
    const out = downsampleTo16k(input, 48000);
    expect(out.length).toBe(1600);
    expect(out[10]).toBeCloseTo(0.5, 5);
  });

  it("handles 44.1 kHz without drifting off the end", () => {
    const out = downsampleTo16k(new Float32Array(4410).fill(0.25), 44100);
    expect(out.length).toBe(1600);
    expect(out.every((v) => Math.abs(v - 0.25) < 1e-6)).toBe(true);
  });

  it("leaves audio that is already 16 kHz alone", () => {
    const input = new Float32Array([0.1, 0.2]);
    expect(downsampleTo16k(input, 16000)).toBe(input);
  });

  it("clips instead of wrapping when converting to 16-bit", () => {
    const pcm = floatToPcm16(new Float32Array([1.5, -1.5, 0, 0.5]));
    expect(pcm[0]).toBe(32767);
    expect(pcm[1]).toBe(-32768);
    expect(pcm[2]).toBe(0);
    expect(pcm[3]).toBe(16383);
  });

  it("round-trips samples through base64", () => {
    const original = new Int16Array([0, 1000, -1000, 32767, -32768]);
    expect(Array.from(base64ToPcm16(pcm16ToBase64(original)))).toEqual(Array.from(original));
  });

  it("round-trips float audio closely", () => {
    const f = new Float32Array([0, 0.25, -0.25, 0.9]);
    const back = pcm16ToFloat32(floatToPcm16(f));
    f.forEach((v, i) => expect(back[i]).toBeCloseTo(v, 3));
  });

  it("ignores a stray odd byte from the network", () => {
    expect(base64ToPcm16(btoa("\u0001\u0000\u0002")).length).toBe(1);
  });
});
