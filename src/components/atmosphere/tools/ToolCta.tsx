import { ArrowRight } from "lucide-react";
import { BOOKING_URL } from "../../../content/siteContent";
import { openBookingModal, openSentientChat } from "../../../lib/siteActions";

/** The two next steps under every tool result: book the intro call, or ask. */
export default function ToolCta({ source, context }: { source: string; context?: string }) {
  return (
    <div className="tool-cta">
      <a
        className="cta-primary"
        href={BOOKING_URL}
        aria-label="Book a call: a 20-minute introductory call"
        onClick={(e) => {
          e.preventDefault();
          openBookingModal({ source, context, ctaLabel: "Book a 20-minute introductory call" });
        }}
      >
        Book a call <ArrowRight size={16} aria-hidden="true" />
      </a>
      <button type="button" className="tool-ask" onClick={() => openSentientChat({ source, context })}>
        <img src="/atmosphere/sp-monogram-white-72.png" alt="" width="12" height="20" />
        Ask Sentient
      </button>
    </div>
  );
}
