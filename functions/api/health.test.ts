import { describe, expect, it } from "vitest";
import { onRequestGet } from "./health";

describe("/api/health", () => {
  it("stays up without describing configured secrets", async () => {
    const res = await onRequestGet({
      request: new Request("https://sentientpartners.ai/api/health"),
      env: {
        ADMIN_PASSWORD: "present",
        ADMIN_PASSWORD_HASH: "present",
        ADMIN_SESSION_SECRET: "present",
        GEMINI_API_KEY: "present",
      },
    } as never);
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(JSON.parse(text).ok).toBe(true);
    expect(text).not.toMatch(/adminPassword|authMode|geminiApiKey|plain_password|sessionSecret/i);
  });
});
