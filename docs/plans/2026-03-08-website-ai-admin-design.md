# Sentient Partners Website AI/Admin Design

**Date:** 2026-03-08

**Status:** Approved

## Goals

- Replace inconsistent browser voice with a consistent server-generated voice.
- Make basic assistant requests like world time and timezone conversion reliable.
- Replace the expired hard-coded promo banner with an admin-managed promotion.
- Add a light CMS-style admin for key homepage and AI settings without requiring code changes.
- Keep recurring cost at zero or as close to zero as possible for now.

## Current Problems

- The site voice uses browser `speechSynthesis`, so voice quality and selection vary by device and browser.
- Time and timezone requests are handled by the LLM alone, which makes simple utility questions less reliable than they should be.
- The header promo is hard-coded in `src/components/Header.tsx`.
- There is no admin surface for editing banner content, AI settings, or future homepage content.

## Recommended Architecture

### Website and Admin

- Keep the website on Cloudflare Pages + Functions.
- Add a small admin route inside the existing React app.
- Store editable settings in a Cloudflare-managed data store.
- Use password-based admin auth backed by environment variables plus a signed session cookie.

### Voice

- Remove browser `speechSynthesis` from the user-facing voice reply path.
- Keep browser microphone capture and browser speech recognition for visitor input.
- Generate reply text on the server through `/api/gemini`.
- Add `/api/voice` to request audio from a hosted open-source TTS service.
- Play the returned audio in the browser.

### TTS Hosting

- Do not host TTS on GitHub, because GitHub cannot run a live inference service for visitors.
- Do not run TTS inference directly inside Cloudflare Workers.
- Host the TTS engine separately on a simple cloud service.
- Good initial targets: Hugging Face Spaces, Railway, Render, Fly.io, or a small VPS later.

## Data Model

The first version only needs a small editable settings shape:

```json
{
  "banner": {
    "enabled": true,
    "message": "Free AI Opportunity Review",
    "ctaText": "Book Strategy Call",
    "ctaUrl": "#booking",
    "variant": "info"
  },
  "ai": {
    "systemPrompt": "Sentient Partners strategist instructions...",
    "siteMemory": "Business facts and positioning...",
    "voiceEnabled": true,
    "voiceProvider": "self_hosted_tts",
    "voiceId": "default-natural-voice"
  },
  "homepage": {
    "heroEyebrow": "AI Systems for SMB Growth",
    "heroHeadline": "..."
  }
}
```

This can grow later without introducing a full CMS now.

## Admin Scope

### Initial Editable Fields

- Banner enabled/disabled
- Banner message
- Banner CTA text and destination
- AI system prompt
- AI memory/business facts
- Voice enabled/disabled
- Voice ID / selected natural voice

### Future-Friendly Fields

- Hero copy
- FAQ entries
- Pricing notes
- Testimonials

## Reliable Time Handling

The assistant should not guess on time-based questions.

### Server Utility Behavior

- Detect requests for current time in a city or region.
- Map common place names to IANA timezones.
- Use server-side `Intl.DateTimeFormat` and timezone-aware formatting.
- Handle conversions such as "If it's 3 PM in Tokyo, what time is it in Madrid?"
- Return structured results to the assistant so the reply is natural but deterministic.

### Examples

- "What time is it in Tokyo right now?"
- "What time is it in Spain?"
- "If it's 2 PM in New York, what time is it in Tokyo?"

## Voice UX

### New Conversation Flow

1. Visitor starts voice mode in the browser.
2. Browser captures audio and transcribes speech.
3. The app sends the transcript to `/api/gemini`.
4. `/api/gemini` returns reply text.
5. The app sends reply text to `/api/voice`.
6. `/api/voice` calls the hosted TTS service using the configured voice.
7. The app plays the returned audio.

### Benefits

- One consistent voice for all visitors.
- Brand-safe output compared with browser-selected voices.
- Future support for switching voices through admin settings.

### Caveat

- Free TTS hosts may cold start or sleep.
- The architecture should isolate this behind `/api/voice` so the TTS backend can move later without changing the frontend contract.

## Banner Recommendation

Remove the expired "FREE 2ND MONTH · ENDS 12/31/25" offer.

Recommended evergreen replacement:

- `Free AI Opportunity Review`

Alternative options:

- `Free AI Growth Audit`
- `Book a Free 15-Minute AI Strategy Call`
- `See Where AI Can Save 10+ Hours Per Week`

## Security

- Protect admin with a single credential pair stored in environment variables for the first version.
- Use signed HTTP-only cookies for admin sessions.
- Keep admin APIs separate from public APIs.
- Validate all admin inputs server-side before persisting settings.

## Rollout Plan

### Phase 1

- Add editable settings storage and admin auth
- Replace hard-coded promo banner
- Add deterministic time handling

### Phase 2

- Replace browser TTS with `/api/voice`
- Connect to hosted open-source TTS
- Add admin voice settings

### Phase 3

- Expand admin-managed homepage content as needed

## Recommendation Summary

Use a Cloudflare-first architecture for the website, admin, and settings. Add a hosted open-source TTS service behind a Cloudflare function for consistent voice. Keep the first admin scope intentionally small and focused on banner, AI prompt/memory, and voice configuration. This delivers better perceived quality quickly without introducing unnecessary platform sprawl or recurring vendor voice costs.
