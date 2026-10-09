# Cinematic website upgrade plan

Updated October 8, 2026 (Pacific Time). Working branch: `feature/global-experience-homepage`, based on `e83b41e`.

## Scope and current status

> **Superseded render instructions.** The render queue described below (`quality-20261009-000001` and any new run folder) is retired: it duplicated finished work and its scene had frozen fog. The locked render plan is in `CLAUDE.md` under "Film render pipeline: locked plan". Follow that.

Refine the current cinematic direction. Preserve the SP identity, business positioning, eight capability demonstrations, and shared booking/chat/voice integrations. No production release or merge is included.

The default site now uses the reviewed 1600×900 clean sunset opening loop, with live aircraft plus independently moving cars, boats, and wakes. The matching source frames were previously review-only; browser comparison showed the loop adds shoreline/city detail and the complete eastern Bay Bridge versus the old 960×540 opening. Fixed-camera captures show vehicles move while the camera is held. This is a bounded opening-only change: the rest of the descent still uses legacy 960×540 backgrounds, and the day/night opening and city loops are absent. The clean loop is not final scenery acceptance: near-water scale, wake realism, shoreline/city fidelity, and close-range asset detail remain open. Keep live surface traffic gated to clean footage so it cannot duplicate baked traffic in legacy frames.

The preserved `live-background-20261008-134539` run has 48 sunset-opening frames, 120 sunset-descent frames and one city frame, plus 336 encoded WebPs; its queue log ends with an incomplete-frame error for `sunset-0035.png`, so this output is not accepted for site replacement. The full-quality run at `film/frames/quality-20261009-000001` resumed at **9:17:00 PM PDT on October 8** through `film/queue-quality.py`; `queue-resume.log` was written at 9:17:01 PM and starts from the existing 18/48 sunset-opening checkpoint. At **9:22:14 PM**, the render log recorded frame 41 and the folder contained 21 sunset-opening PNGs (frames 1–41, odd frame numbers), so 20/48 are complete and 28 remain in this opening sequence. The planned queue totals 648 frames across sunset/day/night opening, descent and city sequences; on this count 628 frames remain, followed by encoding. At the user's instruction, the resumed queue and Blender process were stopped at approximately **9:22 PM**; the partial output is preserved. This is not a reliable completion-time estimate: only three frames had rendered since resumption, at 93.1, 100.6 and 114.1 seconds each. Keep output isolated pending visual review and preserve the active site assets.

The latest supplied aircraft captures still show bad orientation and detached navigation lights. The default renderer now draws the Blender aircraft mesh in 3D along the continuous flight basis, with the lights attached to model geometry; the sprite atlas remains only as a fallback. A 279-sample legacy sprite-anchor check measured a maximum 0.653 px error, but that does not prove the close 3D mesh looks right in the site. Near-range pitch, nose, wing-light placement, separation and performance remain visual acceptance items. `SurfaceTraffic` uses Blender-exported vehicle models and the navigable-water grid; fixed-camera captures show cars and vessels move independently over clean sunset footage. Close boat appearance, wakes and occlusion remain unverified.

The user reports foreground aircraft nearly colliding, followed by one appearing doubled/ghosted. Live aircraft now reject candidate routes that approach another active route within 650 m, sampled every 0.5 seconds over their shared lifetime; focused tests cover crossing and separated routes. This prevents close passes in the live layer, but does not remove a plane baked into the currently served legacy frames. The old Blender animation source also held yaw constant while moving each aircraft; `film/build/aircraft.py` now samples a smooth path and aligns the model's nose with its tangent, including climb/descent pitch. The full rendered film and visual light placement remain unverified until an isolated Blender preview can be made without competing with the active quality queue.

The user has now set hyper-realistic close-range fidelity as an explicit requirement. The current source comments describe intended detail, not proof that it reads as realistic at the camera's closest approach. Evaluate each asset at the actual camera distance and screen size: Golden Gate structure and cables, aircraft body and wing lights, downtown towers, ground relief and shoreline, East Bay neighborhoods, individual houses, and recognizable landmarks. Detail must resolve progressively with proximity and remain coherent with lighting, haze, depth, and scale; capture representative near, mid, and far views before changing the full render. Keep source geometry/material improvements in the rebuild inputs and use isolated preview renders to assess them before replacing any full-quality output.

An additional completeness defect is confirmed in `film/build/landmarks.py`: its Bay Bridge section is explicitly marked “west spans” and models San Francisco only through the west face of Yerba Buena Island. It does not model the eastern half connecting the island to the East Bay. Treat the missing eastern approach/span and its connection to East Bay terrain as a P1 scenery defect; do not call the landmark complete until the full crossing is visible and validated from the approach camera.

The newest aircraft captures show a near aircraft occupying a large share of the frame, with both colored navigation lights visibly detached from its wings. The live layer currently rotates a single 2D sprite and projects the lights through a different camera than the sprite was rendered with. Its atlas has only 16 heading views, so a continuous turn can still snap between visibly different poses. The next corrections are: use sprite-camera wingtip anchors (now computed from the exact sprite camera, 61.1 m span, 190 m camera distance and 85 mm lens), keep lights hidden until their aircraft sprite is loaded, prevent unsafe route convergence, fade aircraft before they reach the camera plane, and validate orientation at several close distances. Keep one sprite on screen at a time; do not reintroduce overlapping crossfades as a substitute for smooth heading coverage.

The user also requests a believable mix of light general-aviation aircraft (including Cessna-class planes) and helicopters, with large passenger jets only one part of the traffic. At present `film/sprites.py` and `AirTraffic` create only AirlinerNear-based aircraft; there are no GA or helicopter models/atlases. `SurfaceTraffic` is now constructed and drawn in the clean opening review, using Blender models from `public/film/traffic/models.json` and the navigable-water grid. Boats and cars move at a held camera, but their near-water scale, wake realism, model detail, and occlusion remain unverified.

The rebuild path had omitted `coast.py`, `city.py`, `landmarks.py`, and `shore.py`, so these quality passes were not applied to older candidates. `film/rebuild.py` now includes terrain, landmarks, city, water and shore passes; the active quality queue snapshots those sources before rebuilding each lighting phase. Camera-matched samples from the new output still need visual review before any replacement of site footage.

### User-facing defect ledger (updated 2026-10-08)

| Priority | Defect | Evidence/status | Closure test |
| --- | --- | --- | --- |
| P0 | Aircraft pivot, roll sideways, disappear or ghost | The 16-view sprite atlas changes in coarse heading steps. Full screen-vector rotation is removed; revised pitch-only transform, source-camera light anchors, 650 m route separation and near-camera fade are now implemented in code. The captured browser still shows the previous broken behavior; revised code has not passed a new visual browser check. Current site backgrounds still contain baked aircraft under the live overlay. | Fixed-scroll Playwright captures show heading changing continuously without wing roll, camera-plane pop, duplicate silhouettes or detached lights for at least 30 seconds; confirm climbs nose-up and descents nose-down. Repeat after scrub/resize and against the clean-background sequence. |
| P1 | Bay Bridge east half missing | `film/build/landmarks.py` contains the eastern span/approach, but the saved scene and active render snapshot omit that pass. | A camera-matched preview shows the crossing connected from San Francisco, across Yerba Buena, to the East Bay shore with plausible span/tower forms and scale. |
| P1 | Boats and cars are missing or scroll-locked | `SurfaceTraffic` is wired into the review-only clean opening and verified moving at a held camera. Legacy frames still contain baked traffic; close waterfront scale, model detail, wakes, and occlusion are unverified. | On clean full-route footage, cars and diverse vessels continue at a fixed scroll, sit on roads/water, remain visible near the camera, and never ghost or cross land. |
| P1 | Traffic has only large airliners | Existing aircraft atlas and renderer use AirlinerNear only; no light-plane or helicopter assets. | Include Cessna-class, other light aircraft and helicopters at perspective-correct sizes and credible speeds/flight behavior alongside occasional commercial jets. |
| P1 | Near scenery lacks hyper-real detail | User explicitly calls out Golden Gate Bridge, skyline, aircraft, terrain, neighborhoods, houses and landmarks. Source-code comments currently overstate visual realism; review actual near/mid/far screenshots against geometry/material output. | Camera-matched near/mid/far review passes for all named asset groups in day, sunset and fog without softness, coarse forms, dark terrain banding or scale breaks. |

The user screenshot `output/playwright/shoreline-current-2026-10-08.png` shows a broad, low-definition coast with very few small-scale shoreline details. Blender inspection measured the terrain at 68,121 vertices across 26 km (about 100 m grid spacing). `film/build/coast.py` now refines the near-water mesh to about 25 m spacing with restrained contour relief; `film/build/shore.py` lifts the coastal greens and grass albedo so dusk lighting does not leave the exposed shore nearly black. These source changes are not present in the active queue snapshot; preview them from a rebuilt scene before replacing the backgrounds. The supplied screenshot clock reads 3:29 PM PT, so it is not a pinned-sunset capture; use the complete `?time=sunset` URL for time-of-day comparisons.

The hero copy is under a reversible preview: “Global Experience.” is pinned near the top and “Local Impact.” near the bottom. At 390×844, both lines and the supporting copy/buttons remain visually separate. Desktop and mobile captures are in `output/playwright/review-2026-10-08/hero-split/`. To restore the original single-position hero, run `git apply -R output/playwright/review-2026-10-08/hero-split/rollback.patch` from the repository root. This experiment is not yet accepted and is not deployed.

The previous 1600×900 candidate queue also baked vehicles into its frames. That queue was stopped and its output preserved under `film/frames/quality-20261008-121103`. It must not be presented as meeting the independent-motion requirement.

Render status and timestamps are recorded at the top of this plan. No candidate is copied into the site before visual acceptance.

## Required work, in order

### 1. Independent motion and integration

- Re-export the vehicle models after rebuilding them from the current Blender source, then inspect their close-range detail.
- Extend the review-only car and boat layers from the clean opening to clean full-route footage after camera-matched scale, placement, wakes and occlusion are accepted. Keep them hidden over legacy frames that already contain baked traffic.
- Cars follow six bridge lanes in the correct direction with safe spacing, varied vehicle types and plausible speeds. They continue at fixed scroll position and do not teleport visibly at route boundaries.
- Boats follow navigable-water routes with varied initial positions, speeds and headings per visit. Include gradual turns, restrained bobbing and rolling, and wakes that follow vessel motion. Do not cross land, collide, or abruptly change direction.
- Aircraft orientation remains a visual acceptance defect: the latest user capture shows a plane flying almost sideways despite the projected-pitch and bank changes passing unit tests. Recheck the sprite nose-axis/camera basis and bank composition against actual browser frames; add a capture-based orientation check before considering it fixed. Aircraft also need smooth continuous orientation, plausible routes and scale, restrained navigation/strobe lights and more convincing near/far behavior. The current hero has a **frozen plane baked into its background**; remove it from the background render and keep aircraft entirely in the live layer so no stationary duplicate remains.
- Drive traffic from elapsed animation time. Scroll controls only the camera. Reduced-motion preferences deliberately suppress continuous movement.
- Project all models through the exact displayed film camera, including held opening/city cameras and responsive crops. Use bridge and terrain occlusion and match lighting, haze and fog rather than drawing conspicuous overlays through scenery.
- Test at fixed scroll positions for at least 30 seconds, then scrub forward/back, resize, switch time of day, and revisit with a different randomized layout.

### 2. Realism and film quality

- Review clean backgrounds before replacing existing sequences: fog depth/layering, bridge structure/materials, water, coast edges, skyline and landmarks.
- Treat close-range realism as an acceptance gate, not a source-code description: inspect Golden Gate members and cable detail, aircraft orientation/lights, city towers, terrain/coast, neighborhoods, houses, and landmarks at near/mid/far camera distances. Increase geometric/material detail where it is visibly coarse, with representative preview captures before a full render.
- Complete the Bay Bridge across both sides of Yerba Buena Island. `film/build/landmarks.py` now contains the eastern span/approach, but the old saved scene and active render snapshot omit this pass. Rebuild the scene, then verify the whole crossing and East Bay connection in camera-matched previews.
- Improve the sparse, soft coastline with a denser near-water terrain profile and restrained shoreline texture/detail. Preview a few representative frames first; preserve 1600×900 / 32-sample output and compare the coast in day, sunset and fog.
- Retain the full-resolution baseline. Do not reduce samples or output size to accelerate delivery.
- Review motion loops for visible reset seams and repeated billowing. Increase temporal sampling only after the composition and live layer are sound.
- Prevent mixing background versions: a new opening cannot transition into an incompatible older descent without a visible scene change.
- Validate every expected desktop/mobile frame, then review complete opening → descent → city transitions for sunset, day and night.

### 3. Current-site design and usability review

Playwright captures and the independent design assessment are complete at 1440×900 and 390×844. Treat the findings below as the review baseline, then record implementation evidence and regressions in the sections that follow.

#### Completed independent review

The unanchored design assessment scored the homepage **22/32 (69%, acceptable)**. Flexibility and help were marked not applicable for this marketing/experience surface. The strongest part is the product-specific story: fog and the Golden Gate lead into a local Main Street, then the founder and a practical process. Navy, ivory, champagne and editorial typography carry consistently across those sections.

| Priority | Finding | Evidence and planned correction | Acceptance criteria |
| --- | --- | --- | --- |
| P1 | Background continuity and independent motion | The default sunset opening now uses the clean loop and live traffic layer; other sunset descent frames remain legacy and can still contain baked/frozen traffic. The opening loop renders moving fog and replaces the incomplete old Bay Bridge opening. Aircraft route physics and 3D lights remain under visual review. | Still open. Replace all legacy backgrounds only after rebuilt scenes pass near/mid/far visual review. Then verify aircraft orientation, no frozen or duplicate aircraft, and independent fog/car/boat movement at fixed scroll for 30 seconds across the full route. Repeat after scrub, resize, revisit and time-of-day changes. |
| P1 | Coastline definition | `shoreline-current-2026-10-08.png` shows a sparse, soft shoreline. `coast.py` now adds finer near-water geometry and `shore.py` raises coastal albedo; a camera-matched preview is pending because the active queue uses older inputs. | The bay edge reads as a natural, irregular shoreline at hero scale in day, sunset and fog without a bright halo, dark land band or noisy artificial outline. |
| P1 | Mobile concierge covers content | `mobile-founder.png` and `mobile-contact.png` showed the fixed floating control over paragraph and contact copy. The redesigned homepage now hides its floating launcher below 640 px and provides an in-flow “Or ask the Concierge a question” action in Contact. Captures: [`mobile-contact-after-2026-10-09-390.png`](../../output/playwright/review-2026-10-08/mobile-contact-after-2026-10-09-390.png) and [`mobile-contact-after-2026-10-09-320.png`](../../output/playwright/review-2026-10-08/mobile-contact-after-2026-10-09-320.png). | Verified at 390 px and 320 px: no fixed launcher; no horizontal overflow; contact links and inline action remain visible. Activating the action opens Concierge. Desktop retains its persistent launcher. |
| P1 | Desktop concierge obscures storefront | The fixed “Talk to the Concierge” launcher covers the right edge of the active capability storefront at desktop widths. The redesign now hides that launcher while the capabilities section is in view and adds an in-flow “Ask the Concierge” action beside the storefront controls. Before evidence: [`concierge-before-storefront-desktop.png`](../../output/playwright/review-2026-10-08/concierge-before-storefront-desktop.png). After-state browser verification and screenshot are pending: Chrome automation stalled during reload, so the stale after capture is not evidence. | At 1440 px and 1024 px, storefront content remains unobstructed and in-flow action opens Concierge; fixed launcher returns outside capabilities; legacy routes retain their launcher behavior. |
| P2 | Long route and unlabelled story gap before the city | The film used to occupy 5,400 px on desktop and 4,389 px on mobile. It is now 4,500 px desktop / 3,714 px mobile, shortening the scroll to the city by one full desktop viewport while preserving the sticky film. The empty overlay gap after “Under the span” is closed: “Enterprise-caliber thinking” now carries through to the city beat. The final “The city” rail stop moved from 97% to 82%, aligning its active state with the city reveal. At the same fixed scroll distance (3,000 px desktop / 2,000 px mobile), both views now show the thesis copy; the desktop rail reports “The city” rather than “Under the span.” Captures: [`film-access-before-desktop.png`](../../output/playwright/review-2026-10-08/film-access-before-desktop.png), [`film-access-after-desktop.png`](../../output/playwright/review-2026-10-08/film-access-after-desktop.png), [`film-access-before-mobile.png`](../../output/playwright/review-2026-10-08/film-access-before-mobile.png), and [`film-access-after-mobile.png`](../../output/playwright/review-2026-10-08/film-access-after-mobile.png). Previous navigation improvements and their responsive screenshots remain below. | At desktop and mobile widths, the visitor reaches the thesis and city with less scrolling, the active label matches the visible city scene, and no copy disappears through the long under-span segment. Five chapter stops remain keyboard reachable with 44 px targets; verify 320 px and 768 px rails, day contrast and reduced-motion navigation. |
| P2 | Scroll camera pacing varies by display refresh rate | The camera and pointer parallax previously used fixed per-frame interpolation (`0.07` and `0.04`), so the same input produced different travel at 30, 60, and 120 Hz. Both now use elapsed-time easing with a bounded 100 ms step; 230 ms camera and 400 ms parallax time constants preserve the established feel at 60 Hz while making it consistent across refresh rates. Captures: [`scroll-easing-before-1440.png`](../../output/playwright/review-2026-10-08/scroll-easing-before-1440.png) and [`scroll-easing-after-1440.png`](../../output/playwright/review-2026-10-08/scroll-easing-after-1440.png). | Unit coverage confirms equal one-second follow distance at 30/60/120 Hz and bounded behavior after a delayed frame. Matched 1440×900 chapter captures preserve scene composition and copy placement. Verify real-device feel at 30/60/120 Hz when available. |
| P2 | Main Street scroll movement varies by refresh rate | The held storefront walk still used `position += (target - position) * 0.09` once per animation frame. It now shares the hero's elapsed-time easing with a 175 ms time constant, which retains approximately the same response at 60 Hz while giving the same time-based follow at 30 and 120 Hz. Reduced-motion mode still maps directly to the scroll target. | All three focused easing tests passed: equal progress at 30/60/120 Hz, a capped response after a delayed frame, and the 60 Hz response match. The current storefront and next-window transition were inspected in Chrome after hot reload, with no composition shift and the selector advancing from 1/8 to 2/8. The full suite passed (10 files, 23 tests), and `npm run verify` built successfully. Representative desktop and mobile screenshots: [`desktop-capabilities-after-2026-10-09.png`](../../output/playwright/review-2026-10-08/desktop-capabilities-after-2026-10-09.png), [`mobile-capabilities-after-2026-10-09-320.png`](../../output/playwright/review-2026-10-08/mobile-capabilities-after-2026-10-09-320.png). |
| P2 | Chapter rail collides with hero copy at compact sizes | Before captures showed the active mobile label over “Local Impact.” at 320×640 and the desktop rail over the same copy at 768×900. The mobile rail is now positioned at 32% of the hero height; the tablet rail moves to 40%, then returns to its lower-right desktop placement at 1024 px and above. After captures show the label clear of the CTA block and the rail clear of the headline/supporting copy. Evidence: [`chapter-rail-before-320.png`](../../output/playwright/review-2026-10-08/chapter-rail-before-320.png), [`chapter-rail-before-768.png`](../../output/playwright/review-2026-10-08/chapter-rail-before-768.png), [`chapter-rail-after-320.png`](../../output/playwright/review-2026-10-08/chapter-rail-after-320.png), [`chapter-rail-after-390.png`](../../output/playwright/review-2026-10-08/chapter-rail-after-390.png), [`chapter-rail-after-768.png`](../../output/playwright/review-2026-10-08/chapter-rail-after-768.png), [`chapter-rail-after-1024.png`](../../output/playwright/review-2026-10-08/chapter-rail-after-1024.png), and [`chapter-rail-after-1440.png`](../../output/playwright/review-2026-10-08/chapter-rail-after-1440.png). | At 320×640, 390×844 and 768×900, chapter controls do not cover “Global Experience,” “Local Impact,” supporting copy or CTAs. At 1024×900 and 1440×900, retain the established lower-right rail. Preserve 44 px hit targets, current-step state, keyboard focus and day/sunset contrast. |
| P2 | CTA wraps and scroll cue overlaps at 320×640 | The before capture shows the booking label wrapping to two lines and “Scroll to descend” over the outline CTA. The 320 px CTA now uses tighter padding and stays on one line; the scroll cue is hidden on short phone viewports while the CTA stack occupies the lower hero. Captures: [`cta-layout-before-320.png`](../../output/playwright/review-2026-10-08/cta-layout-before-320.png) and [`cta-layout-after-320.png`](../../output/playwright/review-2026-10-08/cta-layout-after-320.png). Browser measurements confirm a one-line 52 px booking button, hidden cue at 320×640, and no horizontal overflow. | At 320×640, the booking label remains one line and both CTAs are fully visible without the cue covering either button. Preserve the cue on taller phones and desktop. |
| P2 | Mobile header clips the wordmark | The 320 px capture showed only “Sentient”; the component explicitly hid “Partners” below 360 px. At that narrow breakpoint the monogram and full wordmark now compact while the existing 44 px menu control remains unchanged. Captures: [`header-before-320.png`](../../output/playwright/review-2026-10-08/header-before-320.png), [`header-after-320.png`](../../output/playwright/review-2026-10-08/header-after-320.png), [`header-before-360.png`](../../output/playwright/review-2026-10-08/header-before-360.png), [`header-after-360.png`](../../output/playwright/review-2026-10-08/header-after-360.png), [`header-after-390.png`](../../output/playwright/review-2026-10-08/header-after-390.png), [`header-after-1440.png`](../../output/playwright/review-2026-10-08/header-after-1440.png), and [`header-menu-after-320.png`](../../output/playwright/review-2026-10-08/header-menu-after-320.png). | At 320 px the full name fits with 29 px of separation before the menu; at 360 px the existing wordmark size and 24 px spacing remain unchanged. No horizontal overflow at 320 or 390 px. The menu opens, exposes the full name and section links, and closes successfully. |
| P1 | Daytime chapter-rail contrast | A same-frame desktop sample against the bright day clouds showed the ivory chapter label near 3.0:1; switching the rail to SP navy in the day phase raises the sampled adjacent-pixel contrast to about 4.8:1. The mobile line rail also switches to navy, while its dark active-chapter badge explicitly keeps ivory text. Captures: [`contrast-day-before-1440.png`](../../output/playwright/review-2026-10-08/contrast-day-before-1440.png), [`contrast-day-after-1440.png`](../../output/playwright/review-2026-10-08/contrast-day-after-1440.png), [`contrast-day-after-390.png`](../../output/playwright/review-2026-10-08/contrast-day-after-390.png), [`contrast-day-after-320.png`](../../output/playwright/review-2026-10-08/contrast-day-after-320.png), and [`contrast-sunset-after-390.png`](../../output/playwright/review-2026-10-08/contrast-sunset-after-390.png). | At day/1440, day/390, and day/320, the rail is navy; the mobile badge remains ivory on navy. All five mobile targets stay 44×44 px and no horizontal overflow appears at 390 or 320 px. Golden/sunset continues to use ivory rail text. This resolves the reproduced daytime rail failure; it does not map all four earlier overlay flags. |
| P2 | Fictional capability demos need earlier context | The Summit Air & Heat screens looked like real client work before a note below the storefronts. The capabilities section now says “Illustrative demo · All businesses and data shown are fictional” before its first demo. Captures: [`mobile-capabilities-after-2026-10-09-320.png`](../../output/playwright/review-2026-10-08/mobile-capabilities-after-2026-10-09-320.png), [`desktop-capabilities-after-2026-10-09.png`](../../output/playwright/review-2026-10-08/desktop-capabilities-after-2026-10-09.png). | The disclosure is readable before interaction at desktop and phone widths; supporting offer copy uses established facts and makes no invented client-result claim. |

**Latest aircraft evidence:** The supplied close-up still shows a green navigation light visibly detached below and to the right of the wing. Treat light placement as **open**, despite the local anchor change and an earlier browser sample that looked better. Source inspection also found `film/build/aircraft.py` added fixed Euler rotation keyframes after generating quaternion flight-path keys; that could override the physically oriented poses. The conflicting keys have now been removed. Rebuild and inspect representative close, crossing and turning views before marking orientation or lights accepted. The 16-view sprite atlas can still snap between headings during turns; do not use crossfades that create ghost doubles.

The experience otherwise has a clear emotional arc from awe, to working examples, to a human founder, to a practical process and direct booking call. Navigation and the progressive 1/8 storefront selector keep choices manageable. The primary persona risks are a first-time visitor mistaking sample data for client proof, a mobile visitor encountering an obstructive concierge control, and a visitor interpreting a still scene as broken motion.

**Automated evidence:** The static detector returned zero findings for `Epic.tsx`. The rendered-page overlay flagged 18 style patterns: dark glow (7), palette (3), contrast (4), wide tracking (1), tight line-height (1), all-caps text (1), and animated height (1). Several are likely false positives: cinematic dusk colors, instrument typography, the display heading and chart animation. The four contrast flags cite ratios of 2.0:1, 2.4:1 and two at 3.8:1; their original selectors were not retained. A follow-up same-frame pixel comparison reproduced a daytime chapter-rail failure (about 3.0:1 adjacent to the text) and raised it to about 4.8:1 with the day-phase navy rail. The original four findings are not yet mapped one-to-one. The browser pass recorded no page exceptions, console errors or warnings. Keyboard focus proceeded from skip link through navigation, calls to action, chapter controls and storefront navigation without a trap. Booking and external integration delivery were not exercised.

The injected [browser findings overlay](../../output/playwright/assessment-b-overlay.png) is evidence from a separate headed Playwright review tab, not the user's regular Chrome window.

Measured baseline:

| Measurement | Desktop | Mobile |
| --- | ---: | ---: |
| Document height | 15,188 px | 9,794 px |
| Intro section height | 5,400 px | 4,389 px |
| Capabilities section height | 5,814 px | 834 px |
| Document scroll width | 1,425 px | 375 px |
| Viewport width | 1,440 px | 390 px |

No page exceptions were captured during this screenshot pass. These checks are not end-to-end proof of booking, chat, voice or lead delivery.

Review the balance between cinematic travel and access to business content; the transition into Main Street; demo clarity and legibility; header/CTA hierarchy; founder and service-section rhythm; mobile framing and navigation; keyboard focus; reduced motion; asset loading and constrained-device performance.

### 4. Functional and release verification

- Exercise all eight demos, including switching away during interaction.
- Verify booking opens the intended event and remains keyboard accessible.
- Check concierge/voice failure and recovery states without sending unapproved messages, creating leads or booking appointments.
- Run lint, typecheck, tests and build after implementation.
- Capture the same desktop/mobile views after changes, compare with this baseline and record regressions explicitly.
- Keep local preview, render completion, visual acceptance and production deployment as separate milestones.

## Playwright evidence

### Clean opening with independent traffic

The live review is open in Chrome at `http://localhost:5183/?time=sunset&previewCleanOpening=1&review=surface-traffic`. The 48-frame 1600×900 / 32-sample background is clean of baked traffic; the live surface canvas reports `data-traffic="3d"`, and two captures three seconds apart show the cars and boats move while the camera remains at the opening position. This is an integration check only: the screenshot also makes the unfinished skyline, shore, and missing eastern bridge span easy to see.

![Clean sunset opening with live traffic](../../output/playwright/surface-traffic-review-2026-10-08.png)

The complete clean sunset loop is now used on the default site opening, rather than requiring `previewCleanOpening=1`. A same-size 1440×900 Chrome comparison shows the more complete Bay Bridge/city scene; the viewport stayed at the hero while 17% of fog-region pixels and 20% of water-region pixels changed over three seconds. Captures: [`opening-loop-before-1440.png`](../../output/playwright/review-2026-10-08/opening-loop-before-1440.png), [`opening-loop-after-1440.png`](../../output/playwright/review-2026-10-08/opening-loop-after-1440.png), and [`opening-loop-after-3s-1440.png`](../../output/playwright/review-2026-10-08/opening-loop-after-3s-1440.png). Day/night and the remainder of the descent still use the legacy footage pending quality acceptance.

Captured from `http://localhost:5183/?time=sunset`. These show the current site, not the clean background render candidates. Source capture script and metadata are in [the evidence folder](../../output/playwright/review-2026-10-08/).

### Desktop

Hero:

![Desktop hero](../../output/playwright/review-2026-10-08/desktop-hero.png)

Capabilities:

![Desktop capabilities](../../output/playwright/review-2026-10-08/desktop-capabilities.png)

Services:

![Desktop services](../../output/playwright/review-2026-10-08/desktop-services.png)

Founder:

![Desktop founder](../../output/playwright/review-2026-10-08/desktop-founder.png)

Approach:

![Desktop approach](../../output/playwright/review-2026-10-08/desktop-approach.png)

Contact:

![Desktop contact](../../output/playwright/review-2026-10-08/desktop-contact.png)

### Mobile

![Mobile hero](../../output/playwright/review-2026-10-08/mobile-hero.png)

![Mobile capabilities](../../output/playwright/review-2026-10-08/mobile-capabilities.png)

![Mobile services](../../output/playwright/review-2026-10-08/mobile-services.png)

![Mobile founder](../../output/playwright/review-2026-10-08/mobile-founder.png)

![Mobile approach](../../output/playwright/review-2026-10-08/mobile-approach.png)

![Mobile contact](../../output/playwright/review-2026-10-08/mobile-contact.png)
