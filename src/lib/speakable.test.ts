import { describe, expect, it } from "vitest";
import { toRichParts, toSpeakable } from "./speakable";

describe("toSpeakable", () => {
  it("never reads links or email addresses aloud", () => {
    const out = toSpeakable("Pick a time at https://cal.com/sentient-partners-strategy/introductory-call or email hello@sentientpartners.ai.");
    expect(out).not.toMatch(/https|cal\.com|@|sentientpartners\.ai/);
    expect(out).toContain("the link in the chat");
    expect(out).toContain("the email address in the chat");
  });
  it("keeps the words of markdown links and handles bare domains", () => {
    expect(toSpeakable("Use [the booking page](https://cal.com/x) today")).toBe("Use the booking page today");
    expect(toSpeakable("Go to cal.com/sentient-partners-strategy now")).toBe("Go to the link in the chat now");
  });
});

describe("toRichParts", () => {
  it("makes URLs and emails clickable without eating punctuation", () => {
    const parts = toRichParts("Book at https://cal.com/a/b. Or email hello@sentientpartners.ai!");
    expect(parts).toEqual([
      { kind: "text", text: "Book at " },
      { kind: "link", text: "https://cal.com/a/b", href: "https://cal.com/a/b" },
      { kind: "text", text: ". Or email " },
      { kind: "link", text: "hello@sentientpartners.ai", href: "mailto:hello@sentientpartners.ai" },
      { kind: "text", text: "!" },
    ]);
  });
  it("leaves plain text alone", () => {
    expect(toRichParts("Hello there")).toEqual([{ kind: "text", text: "Hello there" }]);
  });
});
