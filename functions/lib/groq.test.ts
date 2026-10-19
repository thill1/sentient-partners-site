import { afterEach, describe, expect, it, vi } from "vitest";
import { groqChat } from "./groq";

afterEach(() => vi.unstubAllGlobals());

const reply = (content: string, model: string) =>
  Response.json({ model, choices: [{ message: { content } }] });

describe("groqChat", () => {
  it("falls through a retired model to the next one", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      calls.push(body.model);
      if (body.model === "llama-3.3-70b-versatile") {
        return Response.json({ error: { code: "model_not_found" } }, { status: 404 });
      }
      return reply("Hello from Sentient Partners", body.model);
    }));
    const out = await groqChat({
      apiKey: "gsk_x",
      pinnedModel: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(out.ok).toBe(true);
    expect(out.text).toContain("Sentient Partners");
    expect(calls).toEqual(["llama-3.3-70b-versatile", "openai/gpt-oss-120b"]);
  });

  it("asks reasoning models for low effort and leaves room to think", async () => {
    let sent: Record<string, unknown> = {};
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      sent = JSON.parse(init.body as string);
      return reply('{"reply":"ok"}', "openai/gpt-oss-120b");
    }));
    await groqChat({ apiKey: "gsk_x", messages: [], json: true, maxTokens: 300 });
    expect(sent).toMatchObject({
      model: "openai/gpt-oss-120b",
      reasoning_effort: "low",
      max_completion_tokens: 1500,
      response_format: { type: "json_object" },
    });
  });

  it("stops on an auth failure instead of trying every model", async () => {
    const fetchMock = vi.fn(async () => new Response("bad key", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const out = await groqChat({ apiKey: "gsk_bad", messages: [] });
    expect(out.ok).toBe(false);
    expect(out.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
