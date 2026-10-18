import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSignup, NEWSLETTER_ENDPOINT, subscribe } from "./newsletter";

afterEach(() => vi.restoreAllMocks());
const reply = (b: unknown, status = 200) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(b), { status }));

describe("newsletter subscribe", () => {
  it("posts the signup to hello@ via FormSubmit", async () => {
    const f = reply({ success: "true" });
    expect(await subscribe("a@b.co")).toBe(true);
    expect(f.mock.calls[0][0]).toBe(NEWSLETTER_ENDPOINT);
    expect(NEWSLETTER_ENDPOINT).toBe("https://formsubmit.co/ajax/hello@sentientpartners.ai");
    expect(JSON.parse(String((f.mock.calls[0][1] as RequestInit).body))).toMatchObject(
      buildSignup("a@b.co"),
    );
    expect(buildSignup("a@b.co")._subject).toBe("Newsletter signup - a@b.co");
  });
  it("fails on success 'false', HTTP errors and network errors", async () => {
    reply({ success: "false" });
    expect(await subscribe("a@b.co")).toBe(false);
    vi.restoreAllMocks();
    reply({ success: "true" }, 500);
    expect(await subscribe("a@b.co")).toBe(false);
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("x"));
    expect(await subscribe("a@b.co")).toBe(false);
  });
});
