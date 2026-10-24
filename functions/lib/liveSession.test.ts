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
});
