import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPost, parseModelJson } from "./demo-chat";

afterEach(() => vi.unstubAllGlobals());

const call = (body: unknown, env = {}, ip = "198.51.100.1") =>
  onRequestPost({
    request: new Request("https://sentientpartners.ai/api/demo-chat", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": ip },
      body: JSON.stringify(body),
    }),
    env,
  });

describe("parseModelJson", () => {
  it("reads the reply and only the lead fields it was given", () => {
    const out = parseModelJson(
      'Sure: {"reply":"We can help — when works?","lead":{"intent":"Repair","need":"AC not cooling","location":"","timing":"","routed":"Service scheduling","extra":"x"}}',
    );
    expect(out?.reply).toBe("We can help, when works?");
    expect(out?.lead).toEqual({ intent: "Repair", need: "AC not cooling", routed: "Service scheduling" });
  });
  it("rejects output without a reply", () => {
    expect(parseModelJson("no json here")).toBeNull();
    expect(parseModelJson('{"lead":{}}')).toBeNull();
  });
});

describe("/api/demo-chat", () => {
  it("says it's not configured without a key", async () => {
    const res = await call({ message: "hi" });
    expect(res.status).toBe(503);
  });
  it("answers through Groq with a JSON reply", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: '{"reply":"Happy to help. Where is the home?","lead":{"intent":"Repair","need":"No heat","location":"","timing":"","routed":""}}' } }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await call({ message: "My heater stopped working", history: [{ role: "model", text: "Hi!" }] }, { GROQ_API_KEY: "gsk_test" }, "198.51.100.2");
    const data = (await res.json()) as { ok: boolean; reply: string; lead: Record<string, string> };
    expect(data.ok).toBe(true);
    expect(data.reply).toContain("Happy to help");
    expect(data.lead.need).toBe("No heat");
    const sent = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.messages[0].role).toBe("system");
    expect(sent.messages.at(-1)).toEqual({ role: "user", content: "My heater stopped working" });
  });
});
