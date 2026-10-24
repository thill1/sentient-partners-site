import { describe, expect, it } from "vitest";
import { buildLiveSessionConfig, toBrowserConfig } from "./liveSession";

describe("live turn-taking", () => {
  it("uses low-sensitivity voice detection and sends the same settings to the browser", () => {
    const config = buildLiveSessionConfig();
    const vad = config.realtimeInputConfig.automaticActivityDetection;
    expect(vad.startOfSpeechSensitivity).toBe("START_SENSITIVITY_LOW");
    expect(vad.endOfSpeechSensitivity).toBe("END_SENSITIVITY_LOW");
    expect(vad.silenceDurationMs).toBe(800);
    expect(toBrowserConfig(config).realtimeInputConfig).toEqual(config.realtimeInputConfig);
  });

  it("turns on context compression and allows reconnects on one token", async () => {
    const { LIVE_TOKEN_USES } = await import("./liveSession");
    const config = buildLiveSessionConfig();
    expect(config.contextWindowCompression).toEqual({ slidingWindow: {} });
    expect(toBrowserConfig(config).contextWindowCompression).toEqual(config.contextWindowCompression);
    expect(LIVE_TOKEN_USES).toBeGreaterThan(1);
  });
});
