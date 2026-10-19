import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./live-token";
import { resetLiveLimitsForTests } from "../lib/liveLimits";

const created: unknown[] = [];
let failNext = false;
vi.mock("@google/genai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@google/genai")>();
  return {
    ...actual,
    GoogleGenAI: class {
      constructor(public opts: unknown) {}
      authTokens = {
        create: async (params: unknown) => {
          if (failNext) throw new Error("boom");
          created.push({ opts: this.opts, params });
          return { name: "auth_tokens/test-token" };
        },
      };
    },
  };
});

const post = (
  env: Record<string, unknown> = { GEMINI_API_KEY: "g-test" },
  ip = "203.0.113.1",
  headers: Record<string, string> = {},
) =>
  onRequestPost({
    request: new Request("https://sentientpartners.ai/api/live-token", {
      method: "POST",
      headers: { "cf-connecting-ip": ip, ...headers },
    }),
    env,
  } as never);

beforeEach(() => {
  created.length = 0;
  failNext = false;
  resetLiveLimitsForTests();
});
afterEach(() => vi.restoreAllMocks());

describe("/api/live-token", () => {
  it("answers 501 without a key so the page can fall back", async () => {
    const res = await post({});
    expect(res.status).toBe(501);
    expect(((await res.json()) as { configured: boolean }).configured).toBe(false);
    expect(created).toHaveLength(0);
  });

  it("mints a single-use token that expires just after five minutes", async () => {
    const before = Date.now();
    const res = await post();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string; model: string; maxSeconds: number; apiVersion: string };
    expect(body.token).toBe("auth_tokens/test-token");
    expect(body.maxSeconds).toBe(300);
    expect(body.apiVersion).toBe("v1alpha");

    const { opts, params } = created[0] as {
      opts: { apiKey: string };
      params: { config: { uses: number; expireTime: string; newSessionExpireTime: string; liveConnectConstraints: { model: string } } };
    };
    expect(opts.apiKey).toBe("g-test");
    expect(params.config.uses).toBe(1);
    const life = (Date.parse(params.config.expireTime) - before) / 1000;
    expect(life).toBeGreaterThanOrEqual(300);
    expect(life).toBeLessThanOrEqual(330);
    const start = (Date.parse(params.config.newSessionExpireTime) - before) / 1000;
    expect(start).toBeLessThanOrEqual(65);
    expect(params.config.liveConnectConstraints.model).toBe(body.model);
  });

  it("prefers the live key and honours model overrides", async () => {
    await post({ GEMINI_API_KEY: "plain", GEMINI_LIVE_API_KEY: "live", GEMINI_LIVE_MODEL: "gemini-3.1-flash-live-preview" }, "203.0.113.9");
    const { opts, params } = created[0] as { opts: { apiKey: string }; params: { config: { liveConnectConstraints: { model: string } } } };
    expect(opts.apiKey).toBe("live");
    expect(params.config.liveConnectConstraints.model).toBe("gemini-3.1-flash-live-preview");
  });

  it("locks the prompt and the note tool on the server", async () => {
    const res = await post(undefined, "203.0.113.10");
    const body = (await res.json()) as { config: { systemInstruction: { parts: { text: string }[] }; tools: { functionDeclarations: { name: string }[] }[] } };
    expect(body.config.systemInstruction.parts[0].text).toContain("Live voice conversation");
    expect(body.config.tools[0].functionDeclarations[0].name).toBe("show_note_form");
  });

  it("limits each visitor to four sessions an hour", async () => {
    for (let i = 0; i < 4; i += 1) expect((await post(undefined, "203.0.113.20")).status).toBe(200);
    const blocked = await post(undefined, "203.0.113.20");
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(created).toHaveLength(4);
    expect((await post(undefined, "203.0.113.21")).status).toBe(200);
  });

  it("rejects requests from another site", async () => {
    const res = await post(undefined, "203.0.113.30", { origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect(created).toHaveLength(0);
  });

  it("does not leak the key when Google refuses", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    failNext = true;
    const res = await post({ GEMINI_API_KEY: "secret-key" }, "203.0.113.40");
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("secret-key");
  });
});
