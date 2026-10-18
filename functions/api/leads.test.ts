import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./leads";

afterEach(() => vi.restoreAllMocks());

const post = (env: Record<string, string>) =>
  onRequestPost({
    request: new Request("https://x/api/leads", {
      method: "POST",
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
