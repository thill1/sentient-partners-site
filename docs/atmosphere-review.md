# Sentient Partners — cinematic homepage review

Review date: October 9, 2026. Repository: `thill1/sentient-partners-site`.
Branch: `feature/golden-gate-atmosphere`, based on production `main` at `0791377`.
Worktree: `/Volumes/Passport/sentient-partners-atmosphere`.

The implementation is ready for design and stakeholder review. It has not been
pushed, merged, or deployed. The original production checkout and the separate
Blender redesign worktree were preserved.

## Preview

The production preview is available locally at **http://127.0.0.1:5195/**.
To restart it in this worktree:

```sh
npm ci
npm run build
npm run preview -- --host 127.0.0.1 --port 5195
```

Development preview: `npm run dev -- --host 127.0.0.1 --port 5194`.
Use the production preview to evaluate pre-rendering, initial loading, and the
JavaScript-disabled fallback. The local server reads public booking/settings
configuration through a narrow proxy. Lead submission, AI calls, and authenticated
admin operations require the existing Cloudflare Functions environment.

## What changed

- An editorial landing page with the approved global-to-local positioning,
  four business outcomes, eight interactive capability demonstrations, connected
  workflows, implementation narratives, founder, partnership process, and contact.
- A Golden Gate composition with an immediate optimized poster, separate bay
  and bridge/foreground artwork, front and rear WebGL fog, restrained traffic
  and boats, and reversible scroll choreography. Fog evolves independently of
  scroll. Pause, offscreen suspension, reduced motion, and GPU fallbacks are built in.
- Phones use lighter layered parallax without GPU fog. Reduced-motion and
  low-capacity devices use the static composition. The pause control appears only
  at widths where ambient movement is enabled.
- Self-hosted Cormorant Garamond and Inter, an ivory/navy/champagne palette,
  responsive navigation, visible keyboard focus, and accessible modal behavior.
- Pre-rendered crawlable HTML, inlined styles, optimized WebP assets, static
  privacy page, sitemap, robots, manifest, metadata, and cache headers.

Primary implementation: `src/components/atmosphere/{Landing,GoldenGate,Fog,Capabilities}.tsx`,
`atmosphere.css`, `fonts.css`, and `scripts/prerender.mjs`.
Updated integration files: `App.tsx`, `index.tsx`, booking/contact modals,
concierge launcher, toast, `useDialogAccessibility.ts`, and Vite configuration.

## What was retained

React 18, Vite 5, TypeScript, Tailwind, Cloudflare Pages Functions, existing API
contracts, admin interface, configurable announcement, contact capture, concierge,
Cal.com booking destination, official monogram, verified email, canonical domain,
and Open Graph identity. No runtime library was added.

The portrait of Troy Hill and Auburn photograph came from the same repository's
existing redesign worktree. Founder corporate experience is explicitly distinguished
from Sentient Partners' work. Sentient Relay is labeled as in development; all
miniature capability interfaces are identified as illustrative. No testimonials,
client endorsements, financial results, or service prices were invented.

The hero imagery is an artistic reconstruction generated for this design, not a
documentary photograph. [Asset/design notes](atmosphere-design.md) describe provenance.

## Verification

| Check | Result |
| --- | --- |
| ESLint | Passed, zero warnings |
| TypeScript, frontend and Functions | Passed |
| Existing Vitest suite | 8 tests passed across 6 files |
| Production build and pre-render | Passed |
| Git whitespace check | Passed |
| Chromium walkthrough | 23 checks passed, no page errors |
| Responsive layouts | 1920, 1440, 768, 390, and 320px; no horizontal overflow |
| axe WCAG A/AA checks | Zero violations in 10 interface states |
| WebKit | Desktop descent, mobile navigation/scheduling, reduced motion passed |
| Keyboard | Skip link, modal focus cycle, Escape, trigger focus restoration passed |
| Motion | Pinned descent, reverse scrolling, independently evolving fog, pause verified |
| Fallbacks | No JavaScript, no WebGL, and reduced motion inspected |
| Booking | Verified public URL, embedded calendar rendered, direct-link fallback present |
| Contact | Expected request contract and success state verified with a local intercepted response |
| Admin | Unauthenticated login view and public announcement CTA verified |

Screenshots were inspected and used to correct contrast, sticky positioning,
parallax alignment, mobile layout, and integration details. Two stationary frames
2.5 seconds apart changed while fog ran; paused frames 1.5 seconds apart were
pixel-identical. After the last mobile-only CSS refinement, the production build
and browser check confirmed that mobile hides the unnecessary pause control and
desktop retains it.

The build reports the existing outdated Browserslist database and an empty
`genai` chunk; neither prevents the build. Tests do not establish full WCAG
conformance or replace assistive-technology/user testing.

## Measured performance

Lighthouse 13.5, Chrome 155, local production preview, simulated throttling.
These audits preceded the final mobile-only change hiding the pause button.

| Run | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Isolated mobile | 100 | 100 | 100 | 100 | 1.4 s | 0.002 | 0 ms |
| Mobile while another audit ran | 97 | 100 | 100 | 100 | 2.6 s | 0.002 | 0 ms |
| Desktop while another audit ran | 90 | 100 | 100 | 100 | 1.2 s | 0.006 | 210 ms |

Mobile settings: 150 ms RTT, approximately 1.6 Mbps, 4x CPU slowdown.
Desktop settings: 40 ms RTT, approximately 10 Mbps, 1x CPU.
The isolated mobile run meets the 2.5-second LCP target; the concurrent run
shows that the result is sensitive to machine load. Sampled interaction event
durations were 40–56 ms. These are **not field INP measurements**. Production
Core Web Vitals remain unmeasured until an approved deployment receives traffic.

The initial app/vendor JavaScript is approximately 75 KB gzipped; the deferred fog
module is approximately 1.7 KB gzipped. Desktop GPU compilation accounts for some
startup blocking. The composition deliberately avoids full 3D modeling.

## Review evidence

- [Desktop opening](atmosphere-review/desktop.png)
- [Mobile opening](atmosphere-review/mobile.png)
- [Bay descent](atmosphere-review/descent.png)
- [Capability experience](atmosphere-review/capabilities.png)
- [Founder section](atmosphere-review/founder.png)
- [Live calendar rendering](atmosphere-review/calendar.png)
- [Machine-readable check and performance results](atmosphere-review/checks.json)

Full local audit files, scripts, and exploratory screenshots are retained under
`output/playwright/atmosphere/` and excluded from Git. Curated evidence is versioned
above. The local scripts use the Playwright CLI and temporary axe/Lighthouse tools;
they do not add production dependencies.

## Remaining verification boundaries

No real lead or booking was submitted. Provider-side delivery, authenticated admin
saving, and credentialed concierge conversations were not exercised. Calendar
availability and embedding were observed at review time and can change independently.
Responsive and WebKit checks used browser emulation, not physical mobile hardware.
The scene uses a shared bridge/foreground plane with independent bay and atmospheric
layers; it is a restrained 2.5D composition rather than a physically modeled camera
flight. Large displays magnify the 1536px artwork, so review its photographic
sharpness at the intended viewing size.
