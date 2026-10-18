import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPost, sendToFormSubmit } from "./leads";

const lead = {
  name: "Jane Example",
  email: "jane@example.com",
  inquiry: "Hello",
  intent: "contact" as const,
  source: "test",
  leadId: "lead-1",
  submittedAt: "2026-10-17T00:00:00Z",
  referrer: "",
  userAgent: "",
};

const reply = (body: unknown, status = 200) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
  });

afterEach(() => vi.restoreAllMocks());

describe("sendToFormSubmit", () => {
  it("sends the production Referer and Origin to hello@", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(reply({ success: "true" }));
    expect(await sendToFormSubmit("hello@sentientpartners.ai", lead)).toBe(
      true,
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://formsubmit.co/ajax/hello@sentientpartners.ai");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.referer).toBe("https://sentientpartners.ai/");
    expect(headers.origin).toBe("https://sentientpartners.ai");
  });

  it("treats 200 with success 'false' as failure and logs the message without PII", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reply({ success: "false", message: "This form needs Activation." }),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendToFormSubmit("hello@sentientpartners.ai", lead)).toBe(
      false,
    );
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain("This form needs Activation.");
    expect(logged).not.toContain("jane@example.com");
    expect(logged).not.toContain("Jane Example");
  });

  it("fails on non-JSON or non-2xx replies", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(reply("<html>", 200));
    expect(await sendToFormSubmit("hello@sentientpartners.ai", lead)).toBe(
      false,
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      reply({ success: "true" }, 500),
    );
    expect(await sendToFormSubmit("hello@sentientpartners.ai", lead)).toBe(
      false,
    );
  });
});

describe("onRequestPost", () => {
  const post = () =>
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
      env: {},
    } as never);

  it("returns 502 when FormSubmit needs activation", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reply({ success: "false", message: "This form needs Activation." }),
    );
    expect((await post()).status).toBe(502);
  });

  it("returns 200 when FormSubmit confirms", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply({ success: "true" }));
    const res = await post();
    expect(res.status).toBe(200);
    expect(((await res.json()) as { ok: boolean }).ok).toBe(true);
  });
});
