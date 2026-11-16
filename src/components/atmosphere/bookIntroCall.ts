import { openBookingModal } from "../../lib/siteActions";

/** Opens the booking modal for the 20-minute introductory call, tagged with where it was clicked. */
export const bookIntroCall = (source: string): void =>
  openBookingModal({ source, ctaLabel: "Book a 20-minute introductory call" });
