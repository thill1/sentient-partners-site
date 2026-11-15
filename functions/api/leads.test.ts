import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./leads";

afterEach(() => vi.restoreAllMocks());

const post = (env: Record<string, string>, origin = "https://sentientpartners.ai") =>
  onRequestPost({
    request: new Request("https://sentientpartners.ai/api/leads", {
      method: "POST",
      headers: origin ? { origin } : {},
      body: JSON.stringify({
        name: "Jane Example",
        email: "jane@example.com",
        inquiry: "Hi",
        intent: "contact",
        source: "test",
      }),
    }),
    env,
  } as never);

describe("/api/leads (webhook only)", () => {
  it("refuses another site", async () => {
    expect((await post({}, "https://evil.example")).status).toBe(403);
    expect((await post({}, "")).status).toBe(403);
  });

  it("never calls FormSubmit and returns ok when no webhook is set", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const res = await post({});
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards to the webhook only", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const res = await post({ LEADS_WEBHOOK_URL: "https://hook.example/x" });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://hook.example/x");
  });
});
