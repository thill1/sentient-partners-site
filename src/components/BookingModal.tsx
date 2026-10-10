import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, X } from "lucide-react";
import { BOOKING_URL } from "../content/siteContent";
import { BOOKING_MODAL_EVENT, openContactModal } from "../lib/siteActions";
import { useDialogAccessibility } from "../hooks/useDialogAccessibility";

export function BookingModal() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );
  const dialog = useDialogAccessibility(open, () => setOpen(false));
  useEffect(() => {
    const show = () => {
      setStatus("loading");
      setOpen(true);
    };
    window.addEventListener(BOOKING_MODAL_EVENT, show);
    return () => window.removeEventListener(BOOKING_MODAL_EVENT, show);
  }, []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    void fetch("/api/booking", { signal: controller.signal })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (
          !response.ok ||
          typeof data !== "object" ||
          !data ||
          !("bookingAvailable" in data) ||
          !data.bookingAvailable
        )
          setStatus("unavailable");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("unavailable");
      })
      .finally(() => clearTimeout(timeout));
    const frameTimeout = setTimeout(
      () =>
        setStatus((current) =>
          current === "loading" ? "unavailable" : current,
        ),
      18000,
    );
    return () => {
      controller.abort();
      clearTimeout(timeout);
      clearTimeout(frameTimeout);
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div
      ref={dialog}
      className="booking-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-title"
    >
      <div
        className="booking-backdrop"
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />
      <div className="booking-dialog">
        <div className="booking-header">
          <div>
            <h2 id="booking-title">A conversation with Sentient Partners</h2>
            <p>
              Tell us about your business. We'll explore the next step together.
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close booking calendar"
          >
            <X size={23} />
          </button>
        </div>
        <div className="booking-links">
          <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
            Open calendar in a new tab <ArrowUpRight size={14} />
          </a>
          <button
            onClick={() => {
              setOpen(false);
              openContactModal({
                source: "Booking alternative",
                inquiry:
                  "I would like to arrange an introductory conversation.",
              });
            }}
          >
            Request a time by email
          </button>
        </div>
        <div className="booking-body">
          {status === "loading" && (
            <p className="booking-loading" role="status">
              Loading the calendar…
            </p>
          )}
          {status === "unavailable" ? (
            <div className="booking-unavailable">
              <h3>Let's find a time together.</h3>
              <p>
                The embedded calendar couldn't load. You can open the calendar
                directly or send us a note using the links above.
              </p>
            </div>
          ) : (
            <iframe
              src={BOOKING_URL}
              title="Schedule a conversation with Sentient Partners on Cal.com"
              onLoad={() => setStatus("ready")}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
