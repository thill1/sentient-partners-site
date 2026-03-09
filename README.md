<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1aCTuvaSDcx8pwMRAVvzvOOwpXNv7dDLq

## Run Locally

**Prerequisites:** Node.js 20.19+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the app:
   ```bash
   npm run dev
   ```

The chat and voice features call `/api/gemini`, which requires Cloudflare Pages Functions. For local development with the API, use a Cloudflare Pages dev server or deploy to Cloudflare Pages with `API_KEY` (or `GEMINI_API_KEY`) set in the environment.

Important: static GitHub Pages does not run `functions/api/*`. If your custom domain points to a static host only, `/api/gemini` will fail. Use Cloudflare Pages for runtime API routes.

## Deployment Pipeline

Production deploys should go through GitHub Actions to Cloudflare Pages, not GitHub Pages.

Required GitHub secrets:

- `API_KEY` for the server-side Gemini function
- `CLOUDFLARE_API_TOKEN` for the deploy workflow

Current production target:

- Cloudflare Pages project: `sentient-partners-site`
- Cloudflare account ID: `51136f294dbee98a79635101541f2903`

Useful commands:

```bash
npm run verify
npm run deploy:cloudflare
```
