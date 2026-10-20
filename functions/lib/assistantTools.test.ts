import { describe, expect, it, vi } from "vitest";
import { runTool, notifyTroy, formatSlot } from "./assistantTools";
import { parseBookingUrl } from "./calcom";
import { runChat } from "./chatAgent";

const NOW = new Date("2026-10-20T16:00:00Z");
let n = 0;
const ctx = () => ({ ip: `test-${n++}`, timeZone: "America/Los_Angeles", now: NOW });
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("parseBookingUrl", () => {
  it("reads username and slug from the booking link", () => {
    expect(parseBookingUrl()).toEqual({ username: "sentient-partners-strategy", slug: "introductory-call" });
  });
});

describe("check_availability", () => {
  it("explains when the calendar is not connected", async () => {
    const out = await runTool("check_availability", { from_date: "2026-10-21", to_date: "2026-10-21" }, {}, ctx());
    expect(out.response.ok).toBe(false);
  });

  it("lists slots from either shape cal.com may return, in the visitor's zone", async () => {
    const fetcher = vi.fn(async () =>
      reply({
        status: "success",
        data: {
          "2026-10-21": [{ start: "2026-10-21T17:00:00Z", end: "2026-10-21T17:20:00Z" }, "2026-10-21T18:00:00Z"],
        },
      }),
    );
    const out = await runTool("check_availability", { from_date: "2026-10-21", to_date: "2026-10-22" }, { CAL_API_KEY: "cal_x" }, {
      ...ctx(),
      fetcher: fetcher as unknown as typeof fetch,
    });
    const slots = out.response.slots as { start: string; label: string }[];
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].start).toBe("2026-10-21T17:00:00.000Z");
    expect(slots[0].label).toContain("10:00");
    const url = new URL(String((fetcher.mock.calls[0] as unknown[])[0]));
    expect(url.searchParams.get("eventTypeSlug")).toBe("introductory-call");
    expect(url.searchParams.get("start")).toBe("2026-10-21T07:00:00.000Z");
  });

  it("drops times that are already past", async () => {
    const fetcher = async () => reply({ data: { "2026-10-20": ["2026-10-20T15:00:00Z"] } });
    const out = await runTool("check_availability", { from_date: "2026-10-20", to_date: "2026-10-20" }, { CAL_API_KEY: "k" }, {
      ...ctx(),
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(out.response.slots).toEqual([]);
  });
});

describe("check_availability dates", () => {
  it.each(["2026-02-30", "2026-13-01", "tomorrow"])("rejects %s without calling the calendar", async (date) => {
    const fetcher = vi.fn();
    const out = await runTool("check_availability", { from_date: date, to_date: date }, { CAL_API_KEY: "k" }, {
      ...ctx(),
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(out.response.ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("book_meeting", () => {
  const args = { start: "2026-10-21T17:00:00Z", name: "Jane Doe", email: "jane@example.com", note: "Website help" };

  it("books and reports only what the calendar confirmed", async () => {
    const fetcher = vi.fn(async () =>
      reply({ status: "success", data: { uid: "abc", start: "2026-10-21T17:00:00.000Z", end: "2026-10-21T17:20:00.000Z" } }, 201),
    );
    const out = await runTool("book_meeting", args, { CAL_API_KEY: "k" }, { ...ctx(), fetcher: fetcher as unknown as typeof fetch });
    expect(out.response.booked).toBe(true);
    expect(out.ui).toMatchObject({ type: "booked", timeZone: "America/Los_Angeles" });
    const init = (fetcher.mock.calls[0] as unknown[])[1] as RequestInit;
    const sent = JSON.parse(String(init.body));
    expect(sent.attendee).toMatchObject({ name: "Jane Doe", email: "jane@example.com", timeZone: "America/Los_Angeles" });
    expect(sent.eventTypeSlug).toBe("introductory-call");
  });

  it("rejects a bad email without calling the calendar", async () => {
    const fetcher = vi.fn();
    const out = await runTool("book_meeting", { ...args, email: "jane@" }, { CAL_API_KEY: "k" }, { ...ctx(), fetcher: fetcher as unknown as typeof fetch });
    expect(out.response.ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects a time in the past", async () => {
    const out = await runTool("book_meeting", { ...args, start: "2026-10-19T17:00:00Z" }, { CAL_API_KEY: "k" }, ctx());
    expect(out.response.ok).toBe(false);
  });

  it("never claims a booking when cal.com refuses", async () => {
    const fetcher = async () => reply({ status: "error", error: { message: "slot taken" } }, 400);
    const out = await runTool("book_meeting", args, { CAL_API_KEY: "k" }, { ...ctx(), fetcher: fetcher as unknown as typeof fetch });
    expect(out.response.booked).toBeUndefined();
    expect(out.response.ok).toBe(false);
    expect(out.ui).toBeUndefined();
  });

  it("refuses a 2xx reply with no booking id", async () => {
    const fetcher = async () => reply({ status: "success", data: {} }, 201);
    const out = await runTool("book_meeting", args, { CAL_API_KEY: "k" }, { ...ctx(), fetcher: fetcher as unknown as typeof fetch });
    expect(out.response.booked).toBeUndefined();
  });

  it("limits bookings per visitor", async () => {
    const same = { ip: "limit-ip", timeZone: "UTC", now: NOW };
    const results: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      const out = await runTool("book_meeting", { ...args, email: "bad" }, { CAL_API_KEY: "k" }, same);
      results.push(String(out.response.error).includes("Too many"));
    }
    expect(results.filter(Boolean).length).toBe(2);
  });
});

describe("request_follow_up", () => {
  const args = { name: "Jane", email: "jane@example.com", message: "Call me about my site" };

  it("only says Troy was notified when a channel took it", async () => {
    const fetcher = vi.fn(async () => reply({}, 200));
    const out = await runTool("request_follow_up", args, { LEADS_WEBHOOK_URL: "https://hook.example" }, { ...ctx(), fetcher: fetcher as unknown as typeof fetch });
    expect(out.response.delivered).toBe(true);
    expect(out.ui).toBeUndefined();
  });

  it("falls back to the on-screen note form when nothing is configured", async () => {
    const out = await runTool("request_follow_up", args, {}, ctx());
    expect(out.response.delivered).toBe(false);
    expect(out.ui).toEqual({ type: "note", note: "Call me about my site" });
  });

  it("falls back when every channel fails", async () => {
    const fetcher = async () => reply({}, 500);
    const out = await runTool("request_follow_up", args, { LEADS_WEBHOOK_URL: "https://hook.example", RESEND_API_KEY: "r" }, { ...ctx(), fetcher: fetcher as unknown as typeof fetch });
    expect(out.response.delivered).toBe(false);
    expect(out.ui?.type).toBe("note");
  });

  it("emails Troy through Resend with the visitor as reply-to", async () => {
    const fetcher = vi.fn(async () => reply({ id: "1" }));
    const ok = await notifyTroy({ RESEND_API_KEY: "r" }, { ...args, message: "Hi", timeZone: "UTC", sentAt: NOW }, fetcher as unknown as typeof fetch);
    expect(ok).toBe(true);
    const sent = JSON.parse(String(((fetcher.mock.calls[0] as unknown[])[1] as RequestInit).body));
    expect(sent.reply_to).toBe("jane@example.com");
    expect(sent.to).toEqual(["hello@sentientpartners.ai"]);
  });
});

describe("show_contact_form and unknown tools", () => {
  it("returns the note form hint", async () => {
    const out = await runTool("show_contact_form", { note: "hello" }, {}, ctx());
    expect(out.ui).toEqual({ type: "note", note: "hello" });
  });
  it("rejects unknown tools", async () => {
    expect((await runTool("delete_everything", {}, {}, ctx())).response.ok).toBe(false);
  });
});

describe("formatSlot", () => {
  it("writes the time in the visitor's zone", () => {
    expect(formatSlot("2026-10-21T17:00:00Z", "America/New_York")).toContain("1:00");
  });
});

describe("runChat", () => {
  it("runs requested tools and returns the model's final words plus screen hints", async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce({ text: "", calls: [{ name: "show_contact_form", args: { note: "hi" } }], content: { role: "model" } })
      .mockResolvedValueOnce({ text: "Form is up.", calls: [], content: {} });
    const out = await runChat(generate, [], {}, ctx());
    expect(out.text).toBe("Form is up.");
    expect(out.ui).toEqual([{ type: "note", note: "hi" }]);
    const second = generate.mock.calls[1][0] as { role: string; parts: { functionResponse: { name: string } }[] }[];
    expect(second.at(-1)?.parts[0].functionResponse.name).toBe("show_contact_form");
  });

  it("keeps a completed booking when the model fails afterwards, instead of replaying it", async () => {
    const fetcher = async () => reply({ data: { uid: "u1", start: "2026-10-21T17:00:00.000Z", end: "" } }, 201);
    const generate = vi
      .fn()
      .mockResolvedValueOnce({
        text: "",
        calls: [{ name: "book_meeting", args: { start: "2026-10-21T17:00:00Z", name: "Jane", email: "jane@example.com" } }],
        content: {},
      })
      .mockRejectedValueOnce(new Error("model down"));
    const out = await runChat(generate, [], { CAL_API_KEY: "k" }, { ...ctx(), fetcher: fetcher as unknown as typeof fetch });
    expect(out.text).toContain("Booked for");
    expect(out.ui[0]).toMatchObject({ type: "booked" });
  });

  it("still throws when the model fails before any action", async () => {
    const generate = vi.fn().mockRejectedValue(new Error("model down"));
    await expect(runChat(generate, [], {}, ctx())).rejects.toThrow("model down");
  });

  it("stops a model that never stops calling tools", async () => {
    const generate = vi.fn().mockResolvedValue({ text: "", calls: [{ name: "show_contact_form", args: { note: "x" } }], content: {} });
    const out = await runChat(generate, [], {}, ctx());
    expect(generate.mock.calls.length).toBe(5);
    expect(out.text).toContain("booking link");
  });
});
