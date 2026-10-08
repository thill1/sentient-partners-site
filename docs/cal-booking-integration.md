# Introductory-call integration

Verified October 2, 2026.

## Cal.com

- Account: `sentient-partners-strategy`
- Public display name: **Sentient Partners**. Profile copy follows the strategy, implementation, and results positioning.
- Official navy SP logo uploaded and saved. The original artwork is centered on a square white canvas so the full monogram fits the circular avatar; the reusable PNG is [sentient-partners-cal-avatar.png](assets/sentient-partners-cal-avatar.png). Verified on the public event page.
- Event: `3797204`
- Public URL: `https://cal.com/sentient-partners-strategy/20-minute-ai-discovery-call`
- Title: **20-minute introductory call**
- Duration: 20 minutes
- Location: Cal Video
- Copy: discusses business operations, inquiries, follow-up, fit, and an agreed next step. No preparation or commitment required.
- Required booking questions: name and email. Optional notes now ask **What would you like to improve?**
- Booking-page theme: light. Custom brand colors and removal of Cal.com branding require an upgrade on the current account.
- Google Calendar is selected for creating events and checking conflicts. This is configuration evidence; a completed booking has not yet proven calendar insertion or invitation delivery.
- Availability: Monday–Friday, 10 AM–4 PM Pacific. A separate schedule (`2447435`) is assigned to this event; the original default schedule is preserved.
- Minimum notice: 2 hours. Existing buffers and limits preserved.
- Existing reminder workflows include AI phone calls. None was enabled for this event.

## Website

`src/content/siteContent.ts` holds the canonical URL used by the booking modal and Pages Function. The supplied date-specific query is omitted so future visitors can choose current dates.

Run `npm run dev` and `npm run dev:api` in separate terminals after an initial build. Vite proxies `/api` to the local Pages Functions server on port 8788. See the README for setup.

The calendar availability check times out after eight seconds. An iframe that does not load within twenty seconds shows the alternative request path. A direct Cal.com link remains available throughout.

The preview uses Cal.com's official React embed, with navy accents and a light theme. The wider desktop dialog retains event details, including the selected date and time on the attendee form. On phones, date selection opens a separate time-selection view. The header identifies Sentient Partners, the duration, and Cal Video. Timezone selection remains visible.

Verified against the real public event:

- `/api/booking` returns HTTP 200 with the canonical URL and `bookingAvailable: true`.
- Desktop and 390 × 844 phone views load the real embedded calendar.
- Selecting a time reaches the attendee form on both layouts.
- A stopped local API shows the direct-calendar link and request-call alternative.
- The alternative opens the contact form with introductory-call context. No lead was submitted.
- Build, lint, typecheck, eight existing tests, and whitespace checks pass.

## Production boundary

Before repair, `sentientpartners.ai/api/booking` returned the old `coffee-talk` URL with upstream status 404. Production was based on source `72a87a2`.

A separate checkout at `/Volumes/Passport/sentient-booking-repair` contains only the canonical URL repair and the availability-check timeout, based on that exact production source. Build and typecheck pass. The user approved publishing this repair. Commit `3f80b24b85cbcfcc9593f2cc9c473c951fb6c9d0` was deployed to `https://43526097.sentient-partners-site.pages.dev` on production branch `main`. The public domain now returns the canonical URL, `bookingAvailable: true`, and upstream status 200. Its live booking button loads the event with **Sentient Partners** as the host and the approved weekday hours. CSS and vendor assets match the previous production release. The California redesign remains local.

## Remaining verification

No test booking or invitation was created by the agent. A completed booking is still needed to verify the generated Cal Video link, calendar entry, and received invitation. The user redirected the next work toward Cal.com company branding.

The user enabled Chrome's file-access permission and approved a lossless local conversion to add white padding. The official logo from `src/assets/sp-monogram-navy.png` was uploaded, applied, and saved with a successful settings confirmation. The public booking page displays the complete navy SP monogram and **Sentient Partners**.
