import { BOOKING_URL } from "../../src/content/siteContent";

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export const onRequestGet = async () => {
  try {
    const response = await fetch(BOOKING_URL, {
      method: "HEAD",
      redirect: "follow",
    });

    return json({
      ok: true,
      bookingUrl: BOOKING_URL,
      bookingAvailable: response.ok,
      status: response.status,
    });
  } catch {
    return json({
      ok: true,
      bookingUrl: BOOKING_URL,
      bookingAvailable: false,
      status: 0,
    });
  }
};
