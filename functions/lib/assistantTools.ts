import { Type, type FunctionDeclaration } from "@google/genai";
import { createBooking, getSlots } from "./calcom";

/**
 * The actions the assistant can take, shared by text chat and live voice.
 * Every result says exactly what happened, so the assistant only claims what
 * is true. The visitor's words are never trusted: arguments are validated here.
 */

export interface AssistantEnv {
  CAL_API_KEY?: string;
  LEADS_WEBHOOK_URL?: string;
  RESEND_API_KEY?: string;
  REPORT_FROM_EMAIL?: string;
  FOLLOW_UP_EMAIL?: string;
}

export type ToolUi =
  | { type: "booked"; start: string; timeZone: string; label: string }
  | { type: "note"; note: string };

export interface ToolOutcome {
  response: Record<string, unknown>;
  ui?: ToolUi;
}

export interface ToolContext {
  ip: string;
  timeZone: string;
  now?: Date;
  fetcher?: typeof fetch;
}

export const TOOL_NAMES = ["check_availability", "book_meeting", "request_follow_up", "show_contact_form"] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export const isToolName = (name: unknown): name is ToolName => TOOL_NAMES.includes(name as ToolName);

/** The tools as Gemini function declarations. */
export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "check_availability",
    description:
      "Look up open times on Troy's calendar for the 20-minute introductory call. Use before offering or booking a time. Times come back in the visitor's time zone.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        from_date: { type: Type.STRING, description: "First day to look at, YYYY-MM-DD, in the visitor's time zone." },
        to_date: { type: Type.STRING, description: "Last day to look at, YYYY-MM-DD. At most 7 days after from_date." },
      },
      required: ["from_date", "to_date"],
    },
  },
  {
    name: "book_meeting",
    description:
      "Book the introductory call on Troy's calendar. Only call after the visitor has chosen one of the times from check_availability and has given their name and email. Read the email back first.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        start: { type: Type.STRING, description: "The chosen time, exactly as the `start` value returned by check_availability." },
        name: { type: Type.STRING, description: "The visitor's full name." },
        email: { type: Type.STRING, description: "The visitor's email address." },
        note: { type: Type.STRING, description: "Optional: what they want to talk about, in a sentence." },
      },
      required: ["start", "name", "email"],
    },
  },
  {
    name: "request_follow_up",
    description:
      "Ask Troy to follow up with the visitor personally. Only call once the visitor has given their name and email and said what it is about. Use when they would rather hear back than pick a time.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "The visitor's name." },
        email: { type: Type.STRING, description: "The visitor's email address." },
        phone: { type: Type.STRING, description: "Optional phone number." },
        message: { type: Type.STRING, description: "What they want Troy to follow up about, in their own words." },
      },
      required: ["name", "email", "message"],
    },
  },
  {
    name: "show_contact_form",
    description:
      "Put a short note form on the visitor's screen, with their message filled in. Use when they prefer typing their details, or when another tool says it could not complete.",
    parameters: {
      type: Type.OBJECT,
      properties: { note: { type: Type.STRING, description: "What they want to tell Troy, in their own words." } },
      required: ["note"],
    },
  },
];

// ---- Limits ---------------------------------------------------------------------------

const hits = new Map<string, number[]>();

/** Per-isolate counter: blunts a loop or a casual abuser, not a determined one. */
export function overLimit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

const HOUR = 3600_000;
const LIMITS: Record<ToolName, number> = {
  check_availability: 30,
  book_meeting: 4,
  request_follow_up: 3,
  show_contact_form: 30,
};

// ---- Helpers --------------------------------------------------------------------------

const clip = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const validTimeZone = (zone: unknown, fallback = "America/Los_Angeles"): string => {
  const value = String(zone ?? "").trim();
  if (!value) return fallback;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return fallback;
  }
};

export const formatSlot = (iso: string, timeZone: string): string =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));

/** Midnight at the start of a calendar day in a time zone, as a UTC instant. */
function startOfDay(date: string, timeZone: string): Date {
  const guess = new Date(`${date}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(guess);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const shown = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess.getTime() - (shown - guess.getTime()));
}

const addDays = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const fail = (message: string, extra: Record<string, unknown> = {}): ToolOutcome => ({
  response: { ok: false, error: message, ...extra },
});

// ---- Telling Troy ---------------------------------------------------------------------

export interface FollowUp {
  name: string;
  email: string;
  phone?: string;
  message: string;
  timeZone: string;
  sentAt: Date;
}

/** True only when at least one channel confirmed it took the message. */
export async function notifyTroy(env: AssistantEnv, lead: FollowUp, fetcher: typeof fetch = fetch): Promise<boolean> {
  const text = [
    "Follow-up request from the website assistant.",
    "",
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    ...(lead.phone ? [`Phone: ${lead.phone}`] : []),
    "",
    lead.message,
    "",
    `Sent: ${lead.sentAt.toISOString()} (visitor time zone: ${lead.timeZone}).`,
  ].join("\n");
  const attempts: Promise<boolean>[] = [];
  if (env.LEADS_WEBHOOK_URL) {
    attempts.push(
      fetcher(env.LEADS_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          event: "lead_submission",
          lead: {
            name: lead.name,
            email: lead.email,
            inquiry: text,
            intent: "contact",
            source: "Website assistant",
            submittedAt: lead.sentAt.toISOString(),
          },
        }),
      }).then((r) => r.ok),
    );
  }
  if (env.RESEND_API_KEY) {
    attempts.push(
      fetcher("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: env.REPORT_FROM_EMAIL || "Sentient Partners <hello@sentientpartners.ai>",
          to: [env.FOLLOW_UP_EMAIL || "hello@sentientpartners.ai"],
          reply_to: lead.email,
          subject: `Follow-up request from ${lead.name}`,
          text,
        }),
      }).then((r) => r.ok),
    );
  }
  if (!attempts.length) return false;
  const results = await Promise.allSettled(attempts);
  return results.some((r) => r.status === "fulfilled" && r.value);
}

// ---- Running a tool -------------------------------------------------------------------

export async function runTool(
  name: unknown,
  rawArgs: unknown,
  env: AssistantEnv,
  ctx: ToolContext,
): Promise<ToolOutcome> {
  if (!isToolName(name)) return fail("Unknown tool.");
  const args = (rawArgs && typeof rawArgs === "object" ? rawArgs : {}) as Record<string, unknown>;
  const now = ctx.now ?? new Date();
  const timeZone = validTimeZone(ctx.timeZone);

  if (overLimit(`${name}:${ctx.ip}`, LIMITS[name], HOUR, now.getTime())) {
    return fail("Too many requests from this visitor. Suggest the booking link or the note form instead.");
  }

  switch (name) {
    case "check_availability": {
      if (!env.CAL_API_KEY) {
        return fail("The calendar is not connected. Offer the booking link or the note form.");
      }
      const from = clip(args.from_date, 10);
      let to = clip(args.to_date, 10);
      if (!DATE.test(from)) return fail("from_date must be YYYY-MM-DD.");
      if (!DATE.test(to) || to < from) to = from;
      if (to > addDays(from, 7)) to = addDays(from, 7);
      const range = {
        start: startOfDay(from, timeZone).toISOString(),
        end: startOfDay(addDays(to, 1), timeZone).toISOString(),
        timeZone,
      };
      const result = await getSlots(env.CAL_API_KEY, range, undefined, ctx.fetcher);
      if (!result.ok) return fail("Could not read the calendar right now. Offer the booking link or the note form.");
      const future = result.data.filter((iso) => Date.parse(iso) > now.getTime() + 15 * 60_000);
      if (!future.length) {
        return { response: { ok: true, slots: [], message: "No open times in that range. Try other days." } };
      }
      // Spread the picks across days instead of listing a whole morning.
      const byDay = new Map<string, string[]>();
      for (const iso of future) {
        const day = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(iso));
        byDay.set(day, [...(byDay.get(day) ?? []), iso]);
      }
      const picks = [...byDay.values()].flatMap((slots) => slots.filter((_, i) => i % 2 === 0).slice(0, 3)).slice(0, 8);
      return {
        response: {
          ok: true,
          timeZone,
          slots: picks.map((iso) => ({ start: iso, label: formatSlot(iso, timeZone) })),
          message: "Offer two or three of these. Use the `start` value when booking.",
        },
      };
    }

    case "book_meeting": {
      if (!env.CAL_API_KEY) {
        return fail("The calendar is not connected. Offer the booking link or the note form.");
      }
      const name_ = clip(args.name, 100);
      const email = clip(args.email, 254).toLowerCase();
      const start = clip(args.start, 40);
      if (!name_) return fail("Ask for the visitor's name.");
      if (!EMAIL.test(email)) return fail("That email address does not look right. Ask the visitor to spell it again.");
      const startMs = Date.parse(start);
      if (Number.isNaN(startMs) || startMs < now.getTime()) {
        return fail("That time is not valid. Check availability again and use a `start` value from the list.");
      }
      const result = await createBooking(
        env.CAL_API_KEY,
        { start, name: name_, email, timeZone, note: clip(args.note, 400) },
        undefined,
        ctx.fetcher,
      );
      if (!result.ok) {
        const taken = result.status === 400 || result.status === 409;
        return fail(
          taken
            ? "That time could not be booked, it may have just been taken. Check availability again and offer other times."
            : "The booking did not go through. Offer the booking link or the note form.",
        );
      }
      const label = formatSlot(result.data.start, timeZone);
      return {
        response: {
          ok: true,
          booked: true,
          when: label,
          message: `Booked for ${label}. A calendar invitation is on its way to ${email}.`,
        },
        ui: { type: "booked", start: result.data.start, timeZone, label },
      };
    }

    case "request_follow_up": {
      const lead = {
        name: clip(args.name, 100),
        email: clip(args.email, 254).toLowerCase(),
        phone: clip(args.phone, 40) || undefined,
        message: clip(args.message, 1500),
        timeZone,
        sentAt: now,
      };
      if (!lead.name || !lead.message) return fail("Ask for the visitor's name and what it is about.");
      if (!EMAIL.test(lead.email)) return fail("That email address does not look right. Ask the visitor to spell it again.");
      const delivered = await notifyTroy(env, lead, ctx.fetcher).catch(() => false);
      if (delivered) {
        return { response: { ok: true, delivered: true, message: "Troy has been notified and will follow up by email." } };
      }
      return {
        response: {
          ok: true,
          delivered: false,
          message:
            "Could not send it directly. A short note form with their message is now on the visitor's screen: they tap Send there. Do not say Troy has been notified.",
        },
        ui: { type: "note", note: lead.message },
      };
    }

    case "show_contact_form": {
      const note = clip(args.note, 1500);
      return {
        response: { ok: true, message: "The note form is on the visitor's screen. They add their name and email and tap Send." },
        ui: { type: "note", note },
      };
    }
  }
}
