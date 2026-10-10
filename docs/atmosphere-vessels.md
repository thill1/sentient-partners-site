# Boats and aircraft

Implemented in the atmosphere homepage, on `feature/golden-gate-atmosphere`.

- Two photographic sailing yacht variants and a container ship, randomized on arrival and after each crossing. Up to three vessels on desktop, two on phones, and at most one container ship.
- Independent movement, quiet gaps, soft entrance/exit fades, narrow wakes, broken reflections, and time-of-day lighting. Boats sit behind the bridge and fog. Portrait routes use the open water left of the near pier. Yachts travel at 2.8–4 artwork pixels per second; container ships at 1.6–2.2. The animation clock follows elapsed time so a low frame rate does not slow their travel.
- Aircraft now have a tapered fuselage, swept wings, tail, cockpit and engine shading at 9–18 artwork pixels, replacing the 2–4 pixel rectangular marks. One flight is planned on arrival, with the existing sparse schedule afterward.
- Decorative canvases unmount for reduced motion and pause offscreen or in hidden tabs.
- `Ocean.tsx` samples the existing bay photograph through a WebGL shader. Small, irregular traveling ripples displace the texture by a few pixels, with subtle modulation of existing highlights. A feathered mask below artwork row 465 excludes the shoreline and distant mist. The bridge and foreground land remain on their separate layer above the water. The water inherits the photograph's crop, scroll transform, and time-of-day color grading. No replacement water asset is needed.
- Ocean rendering is capped near 25 frames per second and 1800 backing pixels wide. The original still image remains underneath if WebGL is unavailable or its context is lost.

The temporary phone preview uses Vite on port 5197 through a Cloudflare quick tunnel. It is not a production deployment and requires the local server and tunnel to remain running.

## Generated asset

Saved asset: `public/atmosphere/vessels.png`, RGBA PNG, 1536 × 1024. Created with the built-in image generation tool, with transparent background enabled. The original atlas is preserved; `Boats.tsx` draws individual source rectangles directly from it. This is generated imagery, not documentary photography.

Final generation prompt:

> Create ONE photorealistic production sprite atlas on a transparent background for compositing into an aerial telephoto photograph of San Francisco Bay. 1536x1024 landscape canvas. Exactly 3 separate isolated vessels in a single horizontal row, each fully inside its equal-width third of the canvas, with generous transparent margins and no overlap. LEFT THIRD: a white 38-foot cruising sloop, two realistically curved off-white sails, slender mast and fine rigging, dark navy stripe on white hull. CENTER THIRD: a different 45-foot sailing yacht with taller ivory mainsail and smaller jib, cream deck, dark blue hull. RIGHT THIRD: a long realistic container ship with deep charcoal hull, small rusty red waterline, muted rusty-red, slate-blue and cream container stacks, aft white accommodation block. All three are traveling toward the RIGHT, nearly side-on with bow slightly away from camera, seen from an elevated coastal overlook 12 degrees above water, NOT a top-down plan. Consistent warm light from upper right and cool blue-grey shadows, restrained natural photographic color. Sharp actual photographic material detail, realistic ship proportions, no illustration or icon styling. Each vessel's waterline is on the SAME horizontal baseline at 80 percent canvas height. No water, ocean patches, wake, reflection, background, text, logos, drop shadow or checkerboard. Genuine alpha transparency. Vessels only. Sailboats should each occupy about 65 percent of their column width, container ship about 85 percent of its column width.

## Review evidence

Desktop and 390 × 844 phone captures are in `output/playwright/atmosphere/boats/`. Reviewed day, sunset, night, and the scroll descent. The public tunnel loaded successfully in the phone viewport with two vessels, one aircraft, no horizontal overflow, and no page errors. Reduced-motion verification found zero boat/aircraft canvases.

Phone review used browser emulation; physical iPhone/Safari performance remains for device review.

Ocean motion verification sampled the actual WebGL framebuffer at one-second intervals on desktop and phone: successive water samples changed, the upper shoreline sample remained transparent, and WebGL reported no errors. Canvas draw transforms confirmed desktop yacht travel of 26–31 backing pixels over 7.5 seconds and container-ship travel of 16 pixels. Phone travel was 10 pixels for the ship and 16 pixels for the yacht over six seconds. Captures prefixed `ocean-` show the updated scene.
