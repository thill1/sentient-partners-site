import { describe, expect, it } from "vitest";
import { onRequestPost } from "./assistant-tool";

const post = (origin?: string) =>
  onRequestPost({
    request: new Request("https://sentientpartners.ai/api/assistant-tool", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(origin ? { origin } : {}),
      },
      body: JSON.stringify({ name: "show_contact_form", args: { note: "hello" } }),
    }),
    env: {},
  } as never);

describe("/api/assistant-tool origin", () => {
  it("refuses a missing or foreign origin", async () => {
    expect((await post()).status).toBe(403);
    expect((await post("https://evil.example")).status).toBe(403);
  });

  it("accepts the same host", async () => {
    expect((await post("https://sentientpartners.ai")).status).toBe(200);
  });
});
