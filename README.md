<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Sentient Partners website

This project runs as a Vite frontend with Cloudflare Pages Functions for admin settings, Gemini chat, deterministic time responses, and server-backed voice playback.

## Prerequisites

- Node.js 20.x
- npm
- Cloudflare Wrangler v4

## Install and verify

```bash
npm install
npm test
npm run lint
npm run typecheck
npm run build
```

## Local development

Frontend-only development:

```bash
npm run dev
```

Pages Functions and bindings require Wrangler-based local development. Use local secrets in `.dev.vars` and run the Cloudflare dev server when you need `/api/*` routes:

```bash
wrangler dev
```

Recommended local secrets in `.dev.vars`:

```bash
API_KEY=your-gemini-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me
ADMIN_SESSION_SECRET=change-me-too
TTS_BASE_URL=https://your-tts-service.example.com
TTS_API_KEY=optional-if-required
```

Important notes:

- Static hosting alone will not run `functions/api/*`.
- The admin UI lives at `/#/admin`.
- Public site settings are read from `/api/settings`.
- Admin settings updates use authenticated `/api/admin/*` routes.

## Required Cloudflare configuration

`wrangler.jsonc` includes the required KV binding placeholder:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "SITE_SETTINGS",
      "id": "YOUR_KV_NAMESPACE_ID"
    }
  ]
}
```

Required environment variables:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- `API_KEY` or `GEMINI_API_KEY`
- `TTS_BASE_URL`
- `TTS_API_KEY` if your TTS provider requires authentication

Recommended first settings seed:

- banner message: `Free AI Opportunity Review`
- `voiceEnabled: true`
- `voiceId: default-natural-voice`

## Deployment notes

Production deploys should target Cloudflare Pages.

Useful commands:

```bash
npm run deploy:cloudflare
wrangler check
```

Health verification is available at `/api/health` and reports whether the key bindings and environment variables are present without returning secret values.

## Cinematic homepage review

The `feature/golden-gate-atmosphere` branch contains the Golden Gate redesign.
See [the design and asset notes](docs/atmosphere-design.md) and
[the verification report](docs/atmosphere-review.md).

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5194
```

For the pre-rendered production artifact, including the no-JavaScript fallback:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 5195
```

The local Vite server proxies only read-only booking availability and public
settings to the existing website. Contact submission, admin authentication, and
AI provider calls still require Cloudflare Pages Functions and their existing
configuration. No production lead submissions are proxied by the preview.
The review's form submission test intercepts `/api/leads` locally.

The build pre-renders the landing page and inlines its stylesheet, then React
hydrates the markup. Desktop fog is a lazy-loaded, capped-resolution WebGL
shader. Phones use the lighter parallax layers; reduced motion uses the poster.
The existing admin announcement appears below the perspective section, and its
legacy `#blueprint` CTA opens the contact workflow. Admin and concierge settings
retain their existing API contracts.

This branch is for review. The existing deployment command publishes to
production and must only be run after explicit deployment approval.
