import { describe, expect, it } from "vitest";
import { buildNoteInquiry } from "./noteIntent";

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
