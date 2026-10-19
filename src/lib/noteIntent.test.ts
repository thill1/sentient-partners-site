import { describe, expect, it } from "vitest";
import { buildNoteInquiry, wantsNoteForTroy } from "./noteIntent";

describe("wantsNoteForTroy", () => {
  it.each([
    "Please send a note to Troy Hill to meet tomorrow at 1 PM",
    "Can you let Troy know I'd like to talk this week?",
    "Leave a message for Troy",
    "tell Troy to call me back",
    "email Troy",
    "send Troy a note about my website",
    "can we meet tomorrow at 1pm",
    "I want to schedule a call Thursday at 2",
    "1 PM tomorrow works for a meeting",
    "Can Troy call me back?",
    "I'd like Troy to reach out to me",
    "could you call me tomorrow at 2pm",
    "let's talk Thursday at 3",
  ])("treats %j as a request to reach Troy", (text) => {
    expect(wantsNoteForTroy(text)).toBe(true);
  });

  it.each([
    "How do you handle missed calls?",
    "Can your AI take a message for my business?",
    "I'd like to book a 20-minute introductory call.",
    "Can the assistant schedule appointments at 3pm for my customers?",
    "What does Troy's background look like?",
    "What hours can I call today?",
    "I have a call tomorrow; can you help me prepare?",
    "I have a meeting at 3pm tomorrow, how should I follow up with a lead?",
    "Does Troy call clients after a project ships?",
    "ok",
    "",
  ])("leaves %j to the assistant", (text) => {
    expect(wantsNoteForTroy(text)).toBe(false);
  });
});

describe("buildNoteInquiry", () => {
  it("anchors relative times to when the note was sent", () => {
    const text = buildNoteInquiry({
      note: "Meet tomorrow at 1 PM",
      phone: " 555-0100 ",
      sentAt: new Date("2026-10-19T18:45:00Z"),
      timeZone: "America/Los_Angeles",
    });
    expect(text).toContain("Meet tomorrow at 1 PM");
    expect(text).toContain("Phone: 555-0100");
    expect(text).toContain("2026-10-19T18:45:00.000Z");
    expect(text).toContain("America/Los_Angeles");
  });

  it("omits the phone line when none is given", () => {
    const text = buildNoteInquiry({ note: "Hi", sentAt: new Date("2026-10-19T18:45:00Z") });
    expect(text).not.toContain("Phone:");
  });
});
