import { BOOKING_URL } from "../../src/content/siteContent";

/**
 * Thin cal.com v2 client: list open times and book the introductory call.
 * Shapes follow cal.com's published docs; parsing is defensive because the
 * error body is not documented.
 */

const API = "https://api.cal.com/v2";
const SLOTS_VERSION = "2024-09-04";
const BOOKINGS_VERSION = "2026-02-25";

export interface EventRef {
  username: string;
  slug: string;
}

/** "https://cal.com/<username>/<slug>" -> { username, slug } */
export function parseBookingUrl(url: string = BOOKING_URL): EventRef {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return { username: parts[0] ?? "", slug: parts[1] ?? "" };
}

export type CalResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

const headers = (apiKey: string, version: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "cal-api-version": version,
  "content-type": "application/json",
});

const errorText = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: unknown; message?: unknown };
    const raw = body?.message ?? (typeof body?.error === "string" ? body.error : (body?.error as { message?: unknown })?.message);
    if (typeof raw === "string") return raw.slice(0, 300);
    if (Array.isArray(raw)) return raw.map(String).join("; ").slice(0, 300);
  } catch {
    void 0;
  }
  return `cal.com returned ${response.status}`;
};

/** Open start times (ISO, UTC) between two instants, soonest first. */
export async function getSlots(
  apiKey: string,
  range: { start: string; end: string; timeZone: string },
  event: EventRef = parseBookingUrl(),
  fetcher: typeof fetch = fetch,
): Promise<CalResult<string[]>> {
  const url = new URL(`${API}/slots`);
  url.searchParams.set("start", range.start);
  url.searchParams.set("end", range.end);
  url.searchParams.set("timeZone", range.timeZone);
  url.searchParams.set("eventTypeSlug", event.slug);
  url.searchParams.set("username", event.username);
  url.searchParams.set("format", "range");
  let response: Response;
  try {
    response = await fetcher(url, { headers: headers(apiKey, SLOTS_VERSION), signal: AbortSignal.timeout(10000) });
  } catch {
    return { ok: false, error: "Could not reach the calendar.", status: 0 };
  }
  if (!response.ok) return { ok: false, error: await errorText(response), status: response.status };
  const body = (await response.json().catch(() => null)) as { data?: Record<string, unknown> } | null;
  const data = body?.data;
  if (!data || typeof data !== "object") return { ok: true, data: [] };
  const starts: string[] = [];
  for (const day of Object.values(data)) {
    if (!Array.isArray(day)) continue;
    for (const slot of day) {
      const start = typeof slot === "string" ? slot : (slot as { start?: unknown })?.start;
      if (typeof start === "string" && !Number.isNaN(Date.parse(start))) {
        starts.push(new Date(start).toISOString());
      }
    }
  }
  starts.sort();
  return { ok: true, data: starts };
}

export interface BookingInput {
  start: string;
  name: string;
  email: string;
  timeZone: string;
  note?: string;
}

export interface BookingConfirmation {
  uid: string;
  start: string;
  end: string;
}

export async function createBooking(
  apiKey: string,
  input: BookingInput,
  event: EventRef = parseBookingUrl(),
  fetcher: typeof fetch = fetch,
): Promise<CalResult<BookingConfirmation>> {
  const body = {
    start: new Date(input.start).toISOString(),
    attendee: { name: input.name, email: input.email, timeZone: input.timeZone, language: "en" },
    eventTypeSlug: event.slug,
    username: event.username,
    ...(input.note ? { metadata: { note: input.note.slice(0, 400), source: "website assistant" } } : {}),
  };
  let response: Response;
  try {
    response = await fetcher(`${API}/bookings`, {
      method: "POST",
      headers: headers(apiKey, BOOKINGS_VERSION),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { ok: false, error: "Could not reach the calendar.", status: 0 };
  }
  if (!response.ok) return { ok: false, error: await errorText(response), status: response.status };
  const parsed = (await response.json().catch(() => null)) as {
    data?: { uid?: unknown; start?: unknown; end?: unknown };
  } | null;
  const data = parsed?.data;
  if (!data || typeof data.uid !== "string") {
    return { ok: false, error: "The calendar did not confirm the booking.", status: 502 };
  }
  return {
    ok: true,
    data: {
      uid: data.uid,
      start: typeof data.start === "string" ? data.start : body.start,
      end: typeof data.end === "string" ? data.end : "",
    },
  };
}
