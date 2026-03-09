export type LeadIntent = "contact" | "blueprint";

export interface ContactModalPrefill {
  intent?: LeadIntent;
  source?: string;
  ctaLabel?: string;
  name?: string;
  email?: string;
  inquiry?: string;
}

export interface CtaEventDetail {
  source?: string;
  ctaLabel?: string;
}

export const CONTACT_MODAL_EVENT = "open-contact-modal";
export const BOOKING_MODAL_EVENT = "open-booking-modal";
export const CHAT_EVENT = "open-sentient-chat";

export function openContactModal(detail: ContactModalPrefill = {}) {
  window.dispatchEvent(
    new CustomEvent<ContactModalPrefill>(CONTACT_MODAL_EVENT, { detail }),
  );
}

export function openBookingModal(detail: CtaEventDetail = {}) {
  window.dispatchEvent(
    new CustomEvent<CtaEventDetail>(BOOKING_MODAL_EVENT, { detail }),
  );
}

export function openSentientChat(detail: CtaEventDetail = {}) {
  window.dispatchEvent(new CustomEvent<CtaEventDetail>(CHAT_EVENT, { detail }));
}

export function scrollToSection(sectionId: string) {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
