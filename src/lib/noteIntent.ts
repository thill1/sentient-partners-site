/** The text Troy receives with a note left through the on-screen form. */
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
