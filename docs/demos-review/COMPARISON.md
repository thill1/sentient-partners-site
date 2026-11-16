# Relay and voice demos: this branch vs PR #52

Reviewed 16 Nov 2026. This branch is `codex/relay-voice-demos`. PR #52 is `cursor/capability-demos-8318`.

## Recommendation

**Ship this branch's demo. Do not merge #52 as it stands.** Take three small ideas from #52 (listed below) in a follow-up commit on this branch.

Reasons:

1. **#52 is not only the demo.** It has three commits. Only `0a9110b` is the demo. `1ff8638` ("Consolidate the overlapping site quality fixes") and `d3d1e83` ("Close public API gaps and patch same-major dependency advisories") change `functions/api/admin/login.ts`, `functions/lib/adminAuth.ts`, `health.ts`, `leads.ts`, `package-lock.json`, `index.html`, insights, `_headers` and legal pages. Merging #52 would ship admin-auth and dependency changes under a demo title. Those commits should be reviewed and merged on their own, whatever happens to the demo.
2. **This branch matches the brief.** The brief asked for an on-demand section directly after the capabilities showcase. This branch puts it inline on the homepage after `<Capabilities />`. #52 builds a separate `/demos/` page instead, which needs a new route, a prerender entry, a sitemap entry and an `llms.txt` line.
3. **Nothing loads until a visitor asks.** Both demos are `React.lazy` chunks behind a choice. The verify script confirms no demo chunk loads on page load or on scroll. #52 renders both demos as soon as `/demos/` opens.
4. **The voice demo is calmer and does less.** This branch reveals one line per click and labels it "Scripted example · text only". #52 auto-plays on timers with an animated waveform. That is good work, with reduced-motion handling, but it looks closer to a live call than a static script.

## Rule check (both versions)

| Rule | This branch | #52 |
|---|---|---|
| Relay described as "in pilot" | Yes (choice card and heading badge) | Yes (`RELAY_STATUS`) |
| Signature capture is screen 9, after Documents | Yes; More is 7, Documents 8 | Yes; same order |
| CTA is a 20-minute intro call | "Book a 20-minute intro call" | `ToolCta`, "20-minute introductory call" |
| No "AI-First Agency" or "audit" | None found; test enforces | None found; test enforces |
| No `troyhill@` | None; nothing in the demo shows an email | Shows `hello@sentientpartners.ai` in the voice script |
| `/capabilities.pdf` resolves | HTTP 200, SHA-256 matches `public/` | Their PR body says it still resolves |
| No invented claims | Script stays on positioning; no numbers or timing promises | Same |
| No live API or microphone | Verified in browser: 0 mic requests, 0 paid API requests | Unit-test guard plus their browser check |

Both versions also reorder the existing `RelayShowcase` so More comes before Documents. That keeps the showcase consistent with the walkthrough.

## Worth taking from #52

- A **"Walk through the screens"** link in `RelayShowcase` pointing at `#interactive-demos`.
- **Left and right arrow keys** in the Relay walkthrough.
- **Prefetch the next Relay image** after the current one loads.

This branch now includes a unit test (`demos/demos.test.ts`) modelled on #52's. It covers screen order, the "in pilot" label, the content rules, and a guard against network or microphone calls.

## Merge path

1. Split `1ff8638` and `d3d1e83` out of #52 into their own PR, or confirm they already landed through #53/#54. Review them as API and security changes.
2. Close #52's demo part in favour of this branch. Open a PR from `codex/relay-voice-demos` when ready. That is a separate decision; this run did not open one.
3. Optionally add the three items above to this branch first.

## Checks run on this branch (16 Nov)

- `npm run lint`: pass (0 warnings)
- `npm run typecheck`: pass
- `npm test`: 38 files, 182 tests, all pass (5 are new demo tests)
- `npm run build`: pass. The OG step needs Python `fonttools`, `Pillow` and `brotli`. CI installs them; I used a temporary venv locally.
- `node scripts/verify-demos.mjs` against `vite preview` with axe-core: pass at 375px and 1280px. See `checks.json` and the six screenshots in this folder.
