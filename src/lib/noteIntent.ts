/**
 * Spots a visitor asking the assistant to message Troy or set a meeting time.
 * The assistant cannot send messages or book anything itself, so these
 * requests are answered honestly and handed to an on-screen note form.
 *
 * Deliberately narrow: "can your AI take a message for my business?" is a
 * product question, not a request to contact Troy.
 */

const DAYS = "monday|tuesday|wednesday|thursday|friday|saturday|sunday";
const TIME_WORDS = `tomorrow|today|tonight|next week|this week|${DAYS}|at\\s+\\d{1,2}(?::\\d{2})?\\s*(?:am|pm|a\\.m\\.|p\\.m\\.)?|\\d{1,2}(?::\\d{2})?\\s*(?:am|pm|a\\.m\\.|p\\.m\\.)`;

const TO_TROY: RegExp[] = [
  // "send a note to Troy", "leave a message for the team"
  /\b(send|leave|pass|give|drop|write|relay|forward)\b[^.?!]{0,30}\b(note|message)\b[^.?!]{0,20}\b(to|for)\b[^.?!]{0,15}\b(troy|the team|your team|sentient)\b/i,
  // "note to Troy", "message for the team"
  /\b(note|message)\s+(to|for)\s+(troy|the team|your team|sentient)\b/i,
  // "send Troy a note", "email Troy", "message Troy", "text Troy"
  /\b(send|leave|give|drop|write|text|email|message)\b[^.?!]{0,10}\btroy\b/i,
  // "tell Troy", "let Troy know", "have Troy call me"
  /\b(tell|let|notify|ask|have|get)\b[^.?!]{0,12}\btroy\b/i,
];

// "can Troy call me back?", "I'd like Troy to reach out", "Troy call me"
const TROY_FIRST: RegExp[] = [
  /\b(can|could|would|will|please|should)\b[^.?!]{0,8}\btroy\b[^.?!]{0,20}\b(call|contact|reach out|reach|reply|respond|email|text|phone|ring|message|get back)\b/i,
  /\btroy\b[^.?!]{0,10}\b(call|contact|reach out to|reach|email|text|phone|ring|message|reply to|respond to|get back to)\s+(me|us)\b/i,
];

// Scheduling intent, not just a call or meeting mentioned near a time.
// "I have a call tomorrow, can you help me prepare?" and "what hours can I
// call today?" are ordinary questions and stay with the assistant.
const MEETING_WITH_TIME = new RegExp(
  `\\b(meet|schedule|book|set up|arrange|reschedule)\\b[^.?!]{0,40}\\b(${TIME_WORDS})`,
  "i",
);
const CALL_WITH_TIME = new RegExp(
  `(?:\\b(?:can|could|shall|should|will|would)\\s+(?:we|you)\\b|\\blet'?s\\b|\\b(?:want|like|love|need|wanna)\\b[^.?!]{0,6}\\bto\\b)[^.?!]{0,15}\\b(?:call|talk|chat|speak)\\b[^.?!]{0,40}\\b(?:${TIME_WORDS})`,
  "i",
);
const MEETING_WITH_TIME_REVERSED = new RegExp(
  `\\b(?:${TIME_WORDS})\\b[^.?!]{0,40}\\b(?:works?|good|fine|suits)\\b[^.?!]{0,20}\\b(?:meeting|meet|call|chat|talk)\\b|\\b(?:${TIME_WORDS})\\b[^.?!]{0,40}\\bmeet\\b`,
  "i",
);
const ABOUT_THEIR_CUSTOMERS = /\b(customers?|clients?|callers?|patients?|leads?|guests?)\b/i;
const MENTIONS_TROY = /\btroy\b/i;

export function wantsNoteForTroy(text: string): boolean {
  const t = String(text || "").trim();
  if (t.length < 8) return false;
  if (TO_TROY.some((re) => re.test(t)) || TROY_FIRST.some((re) => re.test(t))) return true;
  // A meeting at a specific time is a scheduling request we can't confirm,
  // unless they're asking how the product handles their own customers.
  if (ABOUT_THEIR_CUSTOMERS.test(t) && !MENTIONS_TROY.test(t)) return false;
  return MEETING_WITH_TIME.test(t) || CALL_WITH_TIME.test(t) || MEETING_WITH_TIME_REVERSED.test(t);
}

/** Shown in chat. */
export const NOTE_REPLY_TEXT =
  "I can't send messages or book times myself, but you can leave a note for Troy right here. Add your name and email below and tap Send. Or pick a time on his calendar instead.";

/** Spoken in voice: short, and points at the screen. */
export const NOTE_REPLY_VOICE =
  "I can't send messages by voice myself, but I've put a short note on your screen. Add your name and email, tap Send, and Troy will get it. You can also pick a time on his calendar.";

export interface NoteInquiryInput {
  note: string;
  phone?: string;
  sentAt: Date;
  timeZone?: string;
}

/** The text Troy receives. Includes when it was sent so "tomorrow" is unambiguous. */
export function buildNoteInquiry({ note, phone, sentAt, timeZone }: NoteInquiryInput): string {
  const lines = ["Note for Troy, left through the website assistant.", "", note.trim()];
  if (phone?.trim()) lines.push("", `Phone: ${phone.trim()}`);
  lines.push(
    "",
    `Sent: ${sentAt.toISOString()}${timeZone ? ` (visitor time zone: ${timeZone})` : ""}. Words like "tomorrow" are relative to when it was sent.`,
  );
  return lines.join("\n").slice(0, 4000);
}
