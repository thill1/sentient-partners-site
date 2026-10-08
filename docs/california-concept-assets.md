# California Intelligence concept — image assets

Concept route: `/#/california` · Branch: `concept/california-intelligence`

The concept tells one night in the life of a business, from dusk to dawn. Every
photograph below is **temporary concept imagery** from Unsplash. Each was confirmed
on 2026-09-27 as free (not Unsplash+ / premium) under the
[Unsplash License](https://unsplash.com/license): free for commercial use, no
permission required, attribution appreciated but not required. Selling unaltered
copies or building a competing image service is not permitted.

Files live in `public/concept/california/`. Each image ships as WebP at 1080 and
2400 px wide, and the hero also at 1600 px. All are fetched from Unsplash's image
CDN. Only the hero loads eagerly; everything else is `loading="lazy"`.

## Photographs

| File | Used in | Photographer | Source | Location (per Unsplash) | Live layer | Caption on page |
| --- | --- | --- | --- | --- | --- | --- |
| `sf-dusk` | Hero fallback (if the footage can't load) | Peter Zhan (@peterzhan) | https://unsplash.com/photos/vibrant-cityscape-with-illuminated-skyscrapers-at-night-nip1Vg7XVfY | Not stated. San Francisco from Twin Peaks, visually unambiguous (Market Street, Salesforce Tower, Bay Bridge) | Full chaos → order scene (`hero/sfDuskScene.ts`) | San Francisco, 7:12 PM |
| `bay-bridge-night` | Connection architecture | Tyler Casey (@tylercaseyprod) | https://unsplash.com/photos/aerial-view-of-city-at-nighttime-LHebQUth5sc | San Francisco, CA, USA | Ambient traffic (`hero/ambientScenes.ts`) | Bay Bridge, 8:40 PM |
| `golden-gate-night` | Live demo transition | Derek Zhang (@derekdesign) | https://unsplash.com/photos/a-view-of-the-golden-gate-bridge-at-night-i5hAmZrIpu0 | San Francisco, CA, USA | Ambient deck traffic and aircraft | Golden Gate, 9:47 PM |
| `redwoods` | Redwood interlude | Karthik Sreenivas (@karthik_sreenivas) | https://unsplash.com/photos/a-foggy-road-in-a-forest-lAH6KK6-lqI | Mount Tamalpais, California, USA | — | Mount Tamalpais, 3:40 AM |
| `big-sur-first-light` | "After launch" section | Leo_Visions (@leo_visions_) | https://unsplash.com/photos/aRXFydnwX_8 | Not stated in the location field; the photographer's description reads "Big Sur california" | — | Big Sur, 6:05 AM |
| `sf-dawn` | Closing section | Zetong Li (@zetong) | https://unsplash.com/photos/a-city-with-many-buildings-and-a-sunset-mn89fXEo310 | San Francisco, CA, USA | — | San Francisco, 6:40 AM |

**Captions are narrative markers, not capture times.** The page is structured as
one night. The Big Sur and San Francisco dawn frames may be sunrise or sunset; the
Unsplash metadata doesn't say.

Replaced in the second pass and deleted from the branch: `golden-gate-fog`
(Parrish Freeman), `bridge-tower` (Abel Chen), `vineyard` (Carlos Wolters, location
unverified) and `coast` (Alex Diaz, location unverified). A golden fog-over-hills
candidate (Chris Barbalis) was rejected because it was shot in Tuscany.

## The hero: real footage with a tracked communications layer

**Footage:** "An aerial view of a bridge over water" by **Advancer Drones** on
Pexels, https://www.pexels.com/video/an-aerial-view-of-a-bridge-over-water-19834299/
(clip 19834299; 1920×1080, 60 fps, 62 s). The drone looks across the Bay Bridge,
the Embarcadero piers and the downtown towers, with the Bay and the Marin hills
behind, at dusk. Licence: the Pexels licence (https://www.pexels.com/license/)
allows free commercial use and modification, with no attribution required. Credit
is still good practice, and some footage (recognisable people, trademarks) can need
extra clearance; this clip shows only buildings, the bridge and distant traffic.
It replaces the earlier hero clip 19834297 (same creator), which did not show the
bridge or the waterfront.

Processing (reproducible):
1. Extracted 38 s to 58.1 s of the master (1,205 frames) at 1600×900.
2. Graded toward blue hour (the `GRADE` in `scripts/build-hero-loop.py`, without
   its vignette), frame by frame.
3. `scripts/sunset-sky.py` turns the dusk sky into a sunset, keeping the real
   clouds and the city as filmed. It finds the sky in each frame: a crisp cut
   around the towers and the near hills (smoothed across neighbouring frames so
   no edge blinks), and a soft per-pixel matte near the horizon, so the hazy
   distant ridges keep their exact shape and take on a little of the sunset
   through the haze. It recolours the sky from gold at the horizon through coral and mauve to
   indigo overhead, and adds a warm glow low on the horizon that moves with the
   distant hills as the camera pans, with a soft reflection on the bay. This is
   a grade of the real sky, not a replacement image.
4. `scripts/build-hero-loop.py` turns that segment into a 56 s loop (with
   `GRADE="vignette=PI/5.5"`, since the frames are already graded): the camera
   pans across and back on a cosine time curve, easing to a stop at each end, so
   the loop is seamless with no crossfade. Frames between source frames are
   blended.
5. Encoded H.264 at 30 fps:
   - `sf-bay-1600.mp4` (6.6 MB) for desktop.
   - `sf-bay-960.mp4` (2.3 MB) for landscape phones and data saver.
   - `sf-bay-phone.mp4` (2.1 MB, 704×720), a crop of the same loop for portrait
     phones (`CROP=352,180,704,720`, a lighter vignette), so the skyline sits in
     the band above the headline and stays sharp.
   - WebP poster frames for each cut.
6. `scripts/track-hero-video.py` (OpenCV, Lucas-Kanade optical flow with a
   forward/backward check) finds points at eight moments across the loop and
   tracks them through it. The result is 534 anchor points on rooftops, streets,
   piers and the bridge deck, plus 12 roofline nodes. A node must be a tower
   corner with sky beside it, which rules out the Marin ridge line. They are
   exported to `sf-bay-track.bin` (260 KB) in full-frame coordinates, so every
   cut uses the same data and the overlay stays locked to real buildings as the
   camera pans.

**The overlay** (`src/components/california/hero/signalLayer.ts`, with
`signalKit.ts` for shared colour, easing, icons and wording, and `hubCoin.ts` for
the coin): calls, emails and texts (Lucide icons) rise from those tracked points.
Everything is scaled by how far away its building is, so near piers carry larger
chips than far rooftops and the layer sits in the scene's depth.
- **Without a system:** the page opens on a backlog of messages that have already
  been waiting. They drift, pile up, retry, and go grey, with labels such as
  "Missed call" and "Still waiting".
- **Coming online:** the Sentient hub is a coin with the SP mark, which holds
  still in the sky while the camera moves. It arrives with a flip that settles,
  and one soft pulse spreads out from it across the city. Each waiting message
  is caught as the pulse reaches it, so they are gathered in a cascade, and the
  network's lines grow outward with the pulse.
- **With Sentient:** each message is routed through a skyline node to the hub,
  joins the ring around the coin and circles it while it is processed, turning
  from ivory to orange. The coin spins faster the more it is handling. The answer
  returns to the sender as a spark and opens into a confirmation that holds for
  about two seconds, most with a label such as "Booked for 9:30", "Quote sent" or
  "Routed to on-call". The sender's building then keeps a warm light on (a few
  lit windows, tracked to the footage) for about 48 seconds, so the city slowly
  lights up with the work done. Switching the system off puts those lights out a
  few at a time. The scene controls keep a running count of messages answered
  (or left unanswered) since the scene last changed mode.
- **The visitor's own call:** clicking or tapping the city (anywhere in the hero
  that is not text or a control) places a call from the nearest building, marked
  "Your call". With Sentient it is routed, processed and confirmed as "Your call,
  answered"; without, it waits as "Your call, no answer yet". A one-line hint in
  the scene controls invites this on larger screens and bows out after the first
  call. It is pointer-only and decorative, so it is hidden from assistive tech.
- The pace is deliberately unhurried: under three new messages a second on
  desktop, two on phones.
- Every change is eased; nothing blinks. A dev-only instrumented check records each
  message's drawn position and opacity every frame. On the current build, over
  about 71,000 samples it recorded no position jumps over 30 px and no sudden
  opacity drops. Tracked points now fade in and out in place when a building
  enters or leaves the frame, rather than bending toward where the tracker last
  saw them.
- If the footage or tracking data fails to load, the photographic hero below takes
  over. If autoplay is refused (for example iPhone Low Power Mode), the poster frame
  holds and the overlay still runs.
- Under reduced motion: the poster frame with one composed still of the network,
  the confirmations and the lights.

## The live layers (all coded, no video)

- `src/components/california/hero/cityScene.ts` is a canvas engine that lays
  long-exposure light over a still photograph. It draws traffic streams with
  headlights, taillights and braking; pedestrians; aircraft with landing lights,
  beacons and strobes; inquiry pulses; and a suspension-cable network that routes
  them through a hub.
- Road, bridge-deck and sidewalk paths are traced in image coordinates against grid
  overlays, so the motion sits on real streets at every crop. **If a photograph is
  replaced, its scene coordinates must be re-traced.**
- The hero photograph and its canvases sit in a camera frame wider than the
  viewport. The camera sweeps from downtown to the Bay Bridge and back over 84
  seconds, with a slight push-in, driven by the same animation loop so every light
  stays on its street. Pause stops the camera too.
- `src/components/california/Fog.tsx` generates the drifting fog procedurally
  (tileable value noise, built once per page load, about 10 ms). It is used over the
  hero horizon, the Golden Gate bay, the redwoods and the dawn close. The motion is
  a GPU transform, and it is still under reduced motion.
- The night rail (`NightRail.tsx`) reads the scene list in `CA_NIGHT` in
  `californiaContent.ts`. The photo captions are generated from the same list, so
  the times cannot drift apart.
- Scenes pause when off-screen or in a background tab. Under
  `prefers-reduced-motion` they render one still "long exposure" frame instead.

## Placeholders still needing real material

| Placeholder | Where | What is needed |
| --- | --- | --- |
| Founder portrait | `FounderSection` (panel labelled "Founder portrait — to be photographed") | An environmental portrait of Troy Hill: natural light, quiet California setting, 4:5 crop |
| Case study 01 and 02 | `SelectedWork` (dashed, labelled "Placeholder") | Real, client-approved engagements with a client-verified outcome |
| Founder bio | `FounderSection` | Nothing biographical was invented |

## Photography brief for production replacements

- **Series:** dusk to dawn, California. City at blue hour, bridges at night, forest
  before dawn, coast at first light, city above the fog at sunrise.
- **Mood:** navy skies, sodium-amber streetlight, International Orange steel, and
  fog. Structure inside landscape.
- **Avoid:** postcard viewpoints, HDR, oversaturated sunsets, beaches for their own
  sake, palm trees, anything that reads as tourism.
- **Licensing:** commission or license the hero and the two bridge plates first.
  They carry the live layers, and so are the hardest to swap later.
- **Delivery:** at least 3000 px on the long edge. Export WebP or AVIF at 1080,
  1600 and 2400 widths, using the same filenames to swap in place.

## The drawn graphics (no imagery, no licensing)

Four graphics below the hero are drawn in code and carry no photographs.

- **The path of an inquiry** (`StallPath.tsx`, in the diagnosis section): demand
  enters at "First ring" and should leave as a "Booked job". Small dots are
  inquiries; at each of three gates some pass and the rest pile up behind it, go
  grey and fade. The gates are the three rows of the table below, and pointing at
  a row (or its label) lights its gate. About one in five dots reaches the end,
  which is a drawing of the shape of the problem, not a statistic, and no number
  is shown. Under reduced motion it shows one composed frame.
- **The system as a bridge** (`SystemSchematic.tsx`, in the system section): a
  suspension bridge in elevation, one tower for each of the four layers. Towers
  and spans light as the reader reaches each layer (the same scroll position
  that drives the cable beside it), and a small signal travels the lit spans.
  It replaces the earlier Bay Bridge night photograph, so
  `bay-bridge-night-*.webp` is no longer used on the page and can be removed
  when the concept is promoted.
- **The deliverable, sketched** (`MapDocument.tsx`, in the Opportunity Map
  section): two sheets of the Opportunity Map, the front one showing its three
  real sections ("Where the money leaks", "The system we would install", "First
  30 days") with ruled lines standing for text. It carries no findings.
- **The line down the engagement stages** (`useReached.ts`, `EngagementModel.tsx`):
  the process stages hang on one line that brightens as the reader reaches each,
  the same language as the system section's cable.

All four are hidden from assistive technology because the table and lists beside
them say the same thing in text. Also: the page's arrow is now a drawn icon
rather than a text glyph, a fine sunset-coloured line marks where the hero's
horizon meets the first section, and the scrollbar, caret, form accents and
disclosure animation take the page's palette and easing.
