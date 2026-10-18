import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildFormSubmitLead,
  FORMSUBMIT_ENDPOINT,
  submitLead,
} from "./geminiService";

const lead = {
  name: "Jane Example",
  email: "jane@example.com",
  inquiry: "Hello",
  intent: "contact" as const,
  source: "Contact Modal",
};

afterEach(() => vi.restoreAllMocks());

const mockFetch = (formSubmitReply: unknown, status = 200) =>
  vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (url) =>
      String(url) === "/api/leads"
        ? new Response("{}", { status: 500 })
        : new Response(JSON.stringify(formSubmitReply), { status }),
    );

describe("submitLead", () => {
  it("posts to FormSubmit for hello@ with the expected fields", async () => {
    const f = mockFetch({ success: "true" });
    const res = await submitLead(lead);
    expect(res.success).toBe(true);
    const call = f.mock.calls.find(([u]) => String(u) === FORMSUBMIT_ENDPOINT)!;
    expect(FORMSUBMIT_ENDPOINT).toBe(
      "https://formsubmit.co/ajax/hello@sentientpartners.ai",
    );
    const body = JSON.parse(String((call[1] as RequestInit).body));
    expect(body).toMatchObject({
      _subject: "New Website Inquiry - Jane Example",
      _template: "table",
      _captcha: "false",
      _replyto: "jane@example.com",
      name: "Jane Example",
      intent: "contact",
    });
    expect(body.lead_id).toBeTruthy();
    expect(JSON.stringify(f.mock.calls)).not.toContain("troyhill@");
  });

  it("uses the business subject for blueprint intent", () => {
    expect(
      buildFormSubmitLead({ ...lead, intent: "blueprint" }, "id")._subject,
    ).toBe("New Business Inquiry - Jane Example");
  });

  it("fails when FormSubmit answers 200 with success 'false'", async () => {
    mockFetch({ success: "false", message: "This form needs Activation" });
    expect((await submitLead(lead)).success).toBe(false);
  });

  it("succeeds even if /api/leads fails, and fails on network error", async () => {
    mockFetch({ success: "true" });
    expect((await submitLead(lead)).success).toBe(true);
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    expect((await submitLead(lead)).success).toBe(false);
  });
});
