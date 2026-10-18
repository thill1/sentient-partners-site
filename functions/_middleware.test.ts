import { describe, expect, it } from "vitest";
import { onRequest } from "./_middleware";

const next = async () => new Response("ok");

describe("www → apex middleware", () => {
  it("301s www to apex, keeping path and query", async () => {
    const res = await onRequest({
      request: new Request(
        "https://www.sentientpartners.ai/capabilities.pdf?x=1",
      ),
      next,
    });
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(
      "https://sentientpartners.ai/capabilities.pdf?x=1",
    );
  });
  it("passes apex through", async () => {
    const res = await onRequest({
      request: new Request("https://sentientpartners.ai/capabilities.pdf"),
      next,
    });
    expect(await res.text()).toBe("ok");
  });
});
