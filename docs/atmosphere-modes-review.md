# Atmosphere mode review

Reviewed the actual atmosphere homepage at desktop and phone sizes in sunrise, daytime, sunset, and night. Changes stay within the cinematic hero.

## Clock

The desktop dial now has a darker translucent face matched to each mode, stronger hands and minute marks, larger numerals, and a soft local shade behind the clock copy. On mobile, the analog dial and tagline are hidden. A compact digital time and one 44px scene button replace the expanded clock. Tapping the button reveals the four modes and Live time; selection, Escape, tapping outside, or moving keyboard focus away closes the picker. No enclosing card or header bar was added to the resting clock.

Opening a shared `?scene=day` preview no longer locks the mode picker. Selecting a mode clears that URL override; the selected mode persists for the session. Arrow keys, Home, and End move through the scene radio buttons. Live time restores the automatic Pacific-time mode.

## Fog and lighting

The fog has separate distant banks, a layer following the bridge deck, lower foreground wisps, and the existing scroll-through veil. Openings between layers keep the water and bridge visible. Slower distant drift and finer shader precision improve the shape and depth of the banks.

- Sunrise: cool fog bodies with peach-lit edges.
- Daytime: silver-white banks, more open water, stronger bridge definition.
- Sunset: warmer amber edges with cool shadows and mist along the span.
- Night: blue-silver fog and slightly brighter bridge and bay details, while retaining the dark sky.

The mobile moon sits higher in the sky, centered 90px below the top of the scene. Mobile fog uses its own field width, density, and bank placement, with stronger layer opacity so the portrait crop retains visible folds and mist. Long horizontal water glints are shorter and less bright; star-shaped water flashes are replaced with small crest highlights.

## Water

The initial motion was too subtle in the complete composition. Ripple travel, texture displacement, and the lighting of moving wave faces were strengthened. Water retains the same shoreline mask and static-image fallback.

## Evidence

Mode screenshots are in `output/playwright/atmosphere/modes/`, with `before-`, `after-`, and `final-` prefixes. The first two groups compare the original scene to the first revision; `final-` includes the moon placement and final bridge-deck fog adjustment. The browser review covers desktop, 390px phones, and a 320px narrow phone, including mode switching, keyboard selection, persistence, live time, and reduced motion.

These are local browser and emulated-phone checks. Physical-phone performance and appearance still need device review. No production deployment was performed.

## Mobile headline trial

The mobile heading is now four lines: Global / Experience. / Local / Impact. The standard 390 × 844 view begins about 20px lower. Responsive spacing keeps the links clear of the concierge button at 320 × 740, 375 × 667, 390 × 844, and 430 × 932. Desktop stays on two lines.

The exact layout-only rollback patch is `output/playwright/atmosphere/modes/mobile-headline-trial.patch`. Its reverse application was checked successfully. To undo this trial without reverting fog, moon, or clock work, run `git apply --reverse output/playwright/atmosphere/modes/mobile-headline-trial.patch` after checking that it still applies.

## Mobile lighting refinement

Portrait phones now have separate exposure and color settings for the photograph, bridge, and moving water in all four modes. The shade is concentrated behind the headline and lower copy, leaving the horizon and right-hand tower brighter. Sunrise is peach-lit, daytime retains clearer blue water and red steel, sunset has a broader amber horizon, and night exposes more water and bridge detail. The fog shader and vessel motion are unchanged.

The top shade preserves the white wordmark against the brighter sky. The italic headline is lighter gold and supporting copy is 16px on standard portrait phones, with the existing compact type on short screens. The four-line heading and compact clock remain. A landscape layout at 601–850px wide and up to 500px high fits the introduction and links into the shorter viewport.

Browser evidence: `mobile-light-before-*`, `mobile-light-after-*`, and `mobile-light-final-*` screenshots in the existing modes output directory. Verified 320×740, 375×667, 390×844, 430×932, 844×390 landscape, and 1440×1000 desktop. No horizontal overflow or action/concierge overlap; landscape actions end at 345px within the 390px viewport. Mode selection and reduced-motion fallback work, with no page errors in the final interaction check. Build and lint pass. These remain emulated browser checks, not physical-phone evidence.

To undo only this refinement, check then reverse `output/playwright/atmosphere/modes/mobile-lighting.patch`. Both this patch and the separate headline-trial reverse patch apply to the current source. The temporary phone preview remains https://volt-chrome-michael-thing.trycloudflare.com/; no production deployment was made.


## Mobile clock placement trial

The compact clock now sits 8px above the concierge widget with matching right alignment on mobile. Its scene picker opens upward; desktop placement is unchanged. Phones up to 360px wide reserve extra room below the hero copy so the clock clears the Explore Our Work link. Browser checks cover 390×844, 320×740, 375×667, 844×390, and desktop, plus upward picker opening and scene selection. Screenshots use the `clock-bottom-*` prefix.

To undo this placement alone, reverse `output/playwright/atmosphere/modes/mobile-clock-position.patch`. The independent headline rollback still applies. To reverse the earlier lighting refinement, undo this clock placement first because the lighting patch includes the former landscape clock rule.
