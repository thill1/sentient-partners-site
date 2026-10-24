import { describe, expect, it } from "vitest";
import { MAX_MESSAGE_CHARS, onRequestPost } from "./gemini";

const post = (body: unknown, headers: Record<string, string> = {}, ip = "198.51.100.7") =>
  onRequestPost({
    request: new Request("https://sentientpartners.ai/api/gemini", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": ip, ...headers },
      body: JSON.stringify(body),
    }),
    env: {},
  } as never);

describe("/api/gemini guards", () => {
  it("refuses other sites and requests with no origin", async () => {
    expect((await post({ message: "Hi" }, { origin: "https://evil.example" })).status).toBe(403);
    expect((await post({ message: "Hi" })).status).toBe(403);
    expect((await post({ message: "Hi" }, { origin: "https://sentientpartners.ai.evil.example" })).status).toBe(403);
  });
  it("accepts the site, www and previews", async () => {
    for (const origin of ["https://sentientpartners.ai", "https://www.sentientpartners.ai", "https://qc-fixes.sentient-partners-site.pages.dev"]) {
      expect((await post({ message: "" }, { origin }, `198.51.100.${origin.length}`)).status).toBe(400);
    }
  });
  it("caps message length", async () => {
    const res = await post({ message: "x".repeat(MAX_MESSAGE_CHARS + 1) }, { origin: "https://sentientpartners.ai" }, "198.51.100.20");
    expect(res.status).toBe(413);
  });
  it("hides the model name and timings", async () => {
    const res = await post({ message: "what time is it?" }, { origin: "https://sentientpartners.ai" }, "198.51.100.21");
    const data = await res.json();
    expect(data).not.toHaveProperty("model");
    expect(data).not.toHaveProperty("timings");
  });
  it("rate limits one visitor", async () => {
    let last = 0;
    for (let i = 0; i < 32; i++) last = (await post({ message: "" }, { origin: "https://sentientpartners.ai" }, "198.51.100.99")).status;
    expect(last).toBe(429);
  });
});
