/**
 * Click-through order for the Relay demo.
 * Signature is the ninth screen, immediately after Documents.
 * Copy describes the screens only. Relay is in pilot; no pilot details.
 */
export const RELAY_STATUS = "In pilot";

export const RELAY_SCREENS = [
  {
    id: "today",
    file: "relay-today",
    width: 640,
    height: 1387,
    title: "Today",
    caption: "The next visit, what needs you, and the day's timeline.",
    alt: "Relay Today view: the next visit card, a Needs you list and the Your day timeline",
  },
  {
    id: "jobs",
    file: "relay-jobs",
    width: 640,
    height: 1387,
    title: "Jobs",
    caption: "Open and completed jobs, including one that needs a payment recorded.",
    alt: "Relay jobs list with open and completed tabs, today's jobs and a Record payment button on a job that needs payment",
  },
  {
    id: "job",
    file: "relay-job",
    width: 640,
    height: 1387,
    title: "Job",
    caption: "The address, call, text and map, the next step, and the appointment.",
    alt: "Relay job screen with the customer's address, call, text and map buttons, the next step and the appointment details",
  },
  {
    id: "calendar",
    file: "relay-calendar",
    width: 640,
    height: 1387,
    title: "Calendar",
    caption: "The day, a week strip, each visit's status, and open time.",
    alt: "Relay calendar day view with a week strip, scheduled visits with their status and open time slots",
  },
  {
    id: "customers",
    file: "relay-customers",
    width: 640,
    height: 1387,
    title: "Customers",
    caption: "Search, sort A to Z or recent, and see location and phone.",
    alt: "Relay customers list with search, A to Z and recent sorting, and each customer's location and phone number",
  },
  {
    id: "customer",
    file: "relay-customer",
    width: 640,
    height: 1387,
    title: "Customer",
    caption: "Call, text, documents, a new estimate or invoice, and schedule a job.",
    alt: "Relay customer profile with call and text buttons, documents, create estimate and create invoice, and a Schedule job button",
  },
  {
    id: "more",
    file: "relay-more",
    width: 640,
    height: 1387,
    title: "More",
    caption: "Needs you, documents, help, appearance, map settings, and review links.",
    alt: "Relay More menu with Needs you, Documents, Help, appearance, map settings and review links",
  },
  {
    id: "documents",
    file: "relay-documents",
    width: 640,
    height: 1387,
    title: "Documents",
    caption: "Estimates and invoices, with amounts and statuses such as waiting, paid, and approved.",
    alt: "Relay documents screen listing estimates and invoices with amounts and statuses such as waiting, paid and approved",
  },
  {
    id: "sign",
    file: "relay-sign",
    width: 640,
    height: 1432,
    title: "Signature",
    caption: "The customer types their name, signs on the phone, and agrees to the terms.",
    alt: "Relay estimate approval screen where the customer types their name, signs with a finger on the phone and agrees to the terms",
  },
] as const;

export type RelayScreen = (typeof RELAY_SCREENS)[number];

export function relaySrc(file: string): string {
  return `/showcase/relay/${file}.webp?v=9`;
}
