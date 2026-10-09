# Sentient Partners website

Vite + React + TypeScript + Tailwind, with Cloudflare Pages Functions under `functions/` for booking, chat, voice, leads and admin settings. See `README.md` for install, local development and deploy commands.

## Film render pipeline: locked plan (owner-approved 2026-10-08)

Read this before touching any render. The owner has lost a day to duplicated renders; follow it exactly.

- **One run folder only:** `film/frames/live-background-20261008-134539`. Never create a new run folder, never start a fresh queue, never delete or "clean up" this folder. All remaining frames go here.
- **Resume, don't restart:** `nohup python3 -I film/queue-quality.py film/frames/live-background-20261008-134539 >> film/frames/live-background-20261008-134539/queue.log 2>&1 < /dev/null & disown`. It keeps every validated frame and renders only what is missing. Launch it detached (nohup) or it dies when the session ends. Check it's not already running first (`pgrep -f queue-quality`); never run two render queues at once.
- **Status:** `queue.log` and `render-<sequence>.log` in the run folder; finished web frames land in `web/<sequence>/`.
- **Sequences and their scenes:**
  - Sunset opening loop, sunset descent: done. Sunset city loop: rendering. All from `descent-sunset.blend` (the 13:45 scene).
  - Day and night: `descent-day.blend` and `descent-night.blend` in the run folder are the complete current scene (full Bay Bridge to Oakland, refined coastline, fog wind, golden-tan land). Do not rebuild or replace them.
- **Sunset gets the eastern Bay Bridge by compositing, not re-rendering:** render only the eastern span in the same camera with everything else as a holdout, then composite onto the finished sunset frames (held loops need one render each; the descent needs one per frame). The sunset coastline stays as rendered.
- **Quality:** 1600x900, 32 samples. Do not lower it without the owner's approval.
- **Scene rebuilds:** `film/rebuild.py` must keep `fog_motion.py` after `fog.py` (fog.py alone renders frozen fog). Build with `--python-exit-code 1` so a failed script can never save over a scene.
- **Site assets:** copy a sequence from `web/<sequence>/` into `public/film/` only after reviewing it in the browser.
- **Priority while day and night render:** move the site onto the finished sunset frames, then fix the interface and live layer (aircraft, cars, boats, layout). Rendering is background work; it must not block design fixes.

## Design foundation (approved)

The approved brand and design context lives in `design-foundation/`. Read it before changing the homepage:

- `design-foundation/CLAUDE_ADDENDUM.md`: identity, visual direction, strict constraints, homepage hierarchy and the quality gate. Treat it as part of these instructions.
- `design-foundation/CAPABILITY_CARDS.md`: the eight capability cards and their interaction rules.
- `design-foundation/brand/Sentient_Partners_Brand_GTM_Foundation.pdf`: the canonical messaging. Homepage copy in `src/content/homeContent.ts` is taken from it.
- `design-foundation/references/`: the original California photographs and the three design comps. The comps are direction, not text to copy.

The short version:

- Positioning is **Global Experience. Local Impact.** Signature: **Strategy | Intelligence | Results**. Lead with client outcomes, judgment and accountability, not AI tools.
- Palette is navy, champagne, ivory and charcoal. Serif display type with a readable sans for body and interface.
- The current homepage draws its own imagery live and uses no photographs (the owner allowed this on 2026-10-08). The three supplied photographs remain in `design-foundation/` and on `/#/v2`.
- No badges, floating labels, status pills, filler captions, neon, robots, circuit boards or decorative animation. No autoplay audio or video. Respect reduced motion.
- No invented clients, testimonials, metrics or live-integration claims. Sample data in demos must be obviously illustrative.
- No employer names in the homepage hero or founder section; they belong in a full bio.
- No production deploy, merge to `main` or destructive git action without explicit approval.

## Where things are

- `src/components/epic/`: the homepage. `Epic.tsx` composes it. `Descent.tsx` is the opening film: a scroll-driven camera descent rendered live in WebGL by `descentShader.ts` (a marched fog sea with a volumetric near layer, a modelled suspension bridge over water, a highway with traffic, foothills and a town; no photographs). It lowers its own rendering resolution on slow machines. `MainStreet.tsx` presents the eight capabilities as a walk down a street of eight storefronts: on desktop the street is held and slides past on scroll, on phones it is swiped; the shop in front is lit and its window holds the working demo (only that one is mounted). Under reduced motion the film renders one still frame per scroll position; without WebGL a still gradient stands in.
- `src/components/flagship/`: the previous homepage (photographs, fog, redwood, a day on Main Street), at `/#/v2`.
- `src/components/home/`: shared pieces every version reuses (`SiteHeader`, the footer in `Sections.tsx`, and the eight demos in `cards/`), plus `HomePage.tsx`, the first version of the homepage.
- `src/content/epicContent.ts`, `src/content/flagshipContent.ts` and `src/content/homeContent.ts`: all homepage copy and the demos' sample data. The fictional business is Summit Air & Heat everywhere.
- `src/index.css` (`.sp-*`) and `tailwind.config.js` (`sp` colors, `font-editorial`, `font-ui`): the homepage type scale and tokens.
- `public/home/`: the homepage photographs, built from the originals by `python3 scripts/build-home-images.py`.
- Routes (hash-based, in `src/App.tsx`): `/` homepage, `/#/v2` the photographic version, `/#/v1` the first version (eight-card grid), `/#/classic` the previous production homepage, `/#/california` the earlier California concept, `/#/admin` settings.
- Shared integrations, used by every route: `BookingModal` (Cal.com, link checked through `/api/booking`), `ChatInterface` (the Concierge, `/api/gemini`), `ContactModal` (`/api/leads`), and the front-desk voice demo hook `components/demo/useFrontDeskDemo.ts` (`/api/voice`). Open them through `src/lib/siteActions.ts`.
- `BOOKING_URL` in `src/content/siteContent.ts` is the single booking link. Confirm it returns 200 before changing it.

## Before calling work done

Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`. Check the homepage in a browser at 1440, 768 and 390 px wide, with keyboard focus and reduced motion.
