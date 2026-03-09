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
