# Monogram seal implementation

Selected concept 3 is implemented on desktop and mobile. `ConciergeLauncher.tsx` owns the shared Ask Sentient label, chat/voice subtitle, and round SP seal. GoldenGate uses it in the existing bottom-right position. ChatInterface retains its API, voice, transcript, and contextual-prefill behavior with a coastal-blue panel and serif heading. First opening offers Write a message or Start with voice; subsequent opens preserve the selected conversation mode.

The seal turns once for 1.6 seconds after a 700ms delay when first visible. A 1.4-second tilt repeats every 28 seconds while visible, except during hover, focus, or an open modal. Pointer activation stops the current motion and reminders. Offscreen, hidden-document, and reduced-motion states cancel motion. No animation dependency was added.

The dialog traps keyboard focus, restores launcher focus when dismissed, supports Escape and expand/restore, locks background scrolling, and makes the underlying homepage inert. Its stacking level now clears the fixed navigation on short phones. Voice idle state is still; the active audio visualizer uses gold and slate instead of cyan/purple. Entering the voice tab does not request microphone access.

## Verification

- Lint and production build pass; 35 existing tests pass.
- Browser layout checks at 320×740, 375×667, 430×932, 844×390 landscape, and 1440×900: no horizontal overflow, panel inside viewport, microphone control inside panel, no page errors.
- Browser interaction verification uses a stubbed Gemini response and intercepted transcript archive, so no real message or email was sent. One chat request rendered its reply. Keyboard mode switching, expand/restore, focus trap, Escape, and focus restoration passed.
- Microphone request count is zero before clicking Start, one after. Simulated permission denial renders a visible error. Live AI and real microphone/audio playback were not verified in this Vite-only preview.
- Screenshots are under `output/playwright/atmosphere/modes/seal-*`; the browser interaction script is `output/playwright/atmosphere/seal-interactions.js`.

## Mobile hero spacing

The full headline, description, and actions group is raised and centered between the 78px navigation and the top of the bottom seal. Four-line heading and short-phone typography remain. The former 320px top padding is replaced by balanced 100px top / 88px bottom padding. Narrow-phone extra bottom padding was removed. Screenshots use `centered-hero-*`.

Reverse `output/playwright/atmosphere/modes/mobile-hero-centering.patch` to restore the previous vertical position. The older headline trial patch now requires undoing the centering change first; do not apply older rollback patches blindly.

Current temporary preview: https://serving-limited-volunteer-suppliers.trycloudflare.com/ . This replaces the expired volt-chrome URL. No production deployment or commit was made.
