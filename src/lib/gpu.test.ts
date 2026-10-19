import { describe, expect, it } from "vitest";
import { hasHardwareGpu } from "./gpu";

describe("hasHardwareGpu", () => {
  it("is false without a DOM (prerender)", () => {
    expect(hasHardwareGpu()).toBe(false);
  });
});
