# Black Ledger Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the approved Black Ledger redesign across the public homepage and admin console while preserving existing settings, deterministic time handling, and server-backed voice behavior.

**Architecture:** Keep the current React + Cloudflare Pages Functions architecture and refactor UI layer only. Introduce a shared Black Ledger design token system, redesign the homepage narrative modules (signal -> diagnose -> architect -> prove -> decide), and upgrade admin to a control-surface layout with persistent preview. Preserve API contracts and settings schema so backend behavior remains stable.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Cloudflare Pages Functions, Vitest, existing admin/settings APIs.

---

### Task 1: Establish Black Ledger design tokens and theme foundation

**Files:**
- Modify: `src/index.css`
- Modify: `tailwind.config.js`
- Modify: `src/App.tsx`
- Test: `npm run build`

**Step 1: Write the failing verification expectation**

Define expected token classes and usage in a short checklist:
- New semantic color tokens for ink/graphite/paper/signal are applied.
- Existing pages compile without missing classes.
- No syntax errors in Tailwind config.

**Step 2: Run baseline build**

Run: `npm run build`  
Expected: PASS on old theme, used as baseline before token migration.

**Step 3: Write minimal implementation**

- Add Black Ledger CSS custom properties in `src/index.css` (light/dark-aware as needed).
- Add Tailwind extensions in `tailwind.config.js` mapped to semantic token names.
- Update top-level App container class usage to token-based backgrounds/text.

**Step 4: Verify**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected: PASS

**Step 5: Commit**

```bash
git add src/index.css tailwind.config.js src/App.tsx
git commit -m "feat: add black ledger design token foundation"
```

### Task 2: Redesign header and strategic signal strip

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/hooks/useSiteSettings.ts`
- Modify: `src/lib/siteSettingsSchema.ts`
- Test: `src/hooks/useSiteSettings.test.ts`

**Step 1: Write the failing test**

Extend `src/hooks/useSiteSettings.test.ts` with:
- banner variant mapping supports Black Ledger class semantics
- hidden banner returns `visible: false`

**Step 2: Run test to verify failure**

Run: `npm test -- src/hooks/useSiteSettings.test.ts`  
Expected: FAIL for new expectations.

**Step 3: Write minimal implementation**

- Refactor `Header` into Black Ledger command-bar style.
- Redesign signal strip style and CTA treatment.
- Keep banner-driven behavior and admin editability intact.
- Update defaults in `siteSettingsSchema` only if needed for new copy hierarchy.

**Step 4: Verify**

Run:
- `npm test -- src/hooks/useSiteSettings.test.ts`
- `npm run build`

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/Header.tsx src/hooks/useSiteSettings.ts src/lib/siteSettingsSchema.ts src/hooks/useSiteSettings.test.ts
git commit -m "feat: redesign header and strategic signal strip in black ledger style"
```

### Task 3: Implement Black Ledger briefing hero and operational friction section

**Files:**
- Modify: `src/components/Hero.tsx`
- Modify: `src/content/siteContent.ts`
- Create: `src/components/OperationalFriction.tsx`
- Modify: `src/App.tsx`
- Test: `src/lib/siteContent.test.ts` (create if missing)

**Step 1: Write the failing test**

Create/extend `src/lib/siteContent.test.ts` with expectations:
- Hero copy includes approved primary/secondary CTA labels.
- Operational friction content includes required diagnosis pillars.

**Step 2: Run test to verify failure**

Run: `npm test -- src/lib/siteContent.test.ts`  
Expected: FAIL because content/test scaffolding is not aligned yet.

**Step 3: Write minimal implementation**

- Convert hero into split briefing layout with left strategic argument and right intelligence artifact.
- Add compact proof markers under hero CTAs.
- Implement new `OperationalFriction` section and insert after hero in App order.
- Update content constants accordingly.

**Step 4: Verify**

Run:
- `npm test -- src/lib/siteContent.test.ts`
- `npm run lint`
- `npm run build`

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/Hero.tsx src/components/OperationalFriction.tsx src/content/siteContent.ts src/App.tsx src/lib/siteContent.test.ts
git commit -m "feat: add black ledger hero and operational friction module"
```

### Task 4: Replace service-grid framing with Revenue Response Architecture module

**Files:**
- Create: `src/components/RevenueArchitecture.tsx`
- Modify: `src/components/Services.tsx`
- Modify: `src/content/siteContent.ts`
- Modify: `src/App.tsx`
- Test: `src/components/RevenueArchitecture.test.tsx` (or utility test if no RTL setup)

**Step 1: Write the failing test**

Add a test asserting:
- Four required architecture pillars render in order.
- Interpretation line is present.

**Step 2: Run test to verify failure**

Run: `npm test -- src/components/RevenueArchitecture.test.tsx`  
Expected: FAIL because component does not exist.

**Step 3: Write minimal implementation**

- Build connected architecture panel component.
- Reduce/retune legacy services section emphasis.
- Insert new architecture module in approved narrative position.

**Step 4: Verify**

Run:
- `npm test -- src/components/RevenueArchitecture.test.tsx`
- `npm run typecheck`
- `npm run build`

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/RevenueArchitecture.tsx src/components/Services.tsx src/content/siteContent.ts src/App.tsx src/components/RevenueArchitecture.test.tsx
git commit -m "feat: implement revenue response architecture section"
```

### Task 5: Redesign proof and engagement decision modules

**Files:**
- Modify: `src/components/Testimonials.tsx`
- Modify: `src/components/CTASection.tsx`
- Modify: `src/content/siteContent.ts`
- Create: `src/components/MeasuredOutcomes.tsx` (if splitting concerns)
- Modify: `src/App.tsx`
- Test: `src/lib/siteContent.test.ts`

**Step 1: Write the failing test**

Add assertions that:
- Proof section heading becomes `Measured Operational Lift`.
- Engagement section contains approved CTA hierarchy.

**Step 2: Run test to verify failure**

Run: `npm test -- src/lib/siteContent.test.ts`  
Expected: FAIL for old headings and CTA labels.

**Step 3: Write minimal implementation**

- Refactor proof into outcome-led modules with before/after framing.
- Refactor final CTA into executive decision layer style.
- Ensure one dominant CTA and one secondary CTA.

**Step 4: Verify**

Run:
- `npm test -- src/lib/siteContent.test.ts`
- `npm run lint`
- `npm run build`

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/Testimonials.tsx src/components/CTASection.tsx src/components/MeasuredOutcomes.tsx src/content/siteContent.ts src/App.tsx src/lib/siteContent.test.ts
git commit -m "feat: redesign proof and engagement decision sections"
```

### Task 6: Rebuild admin into Black Ledger control-surface layout

**Files:**
- Modify: `src/components/AdminPanel.tsx`
- Modify: `src/components/AdminLogin.tsx`
- Modify: `src/App.tsx`
- Modify: `src/lib/adminApi.ts` (if helper changes needed)
- Create: `src/components/AdminPreviewPanel.tsx`
- Test: `src/lib/adminApi.test.ts`

**Step 1: Write the failing test**

Add/extend `adminApi` or helper test for draft merge + preview-safe state update behavior.

**Step 2: Run test to verify failure**

Run: `npm test -- src/lib/adminApi.test.ts`  
Expected: FAIL for new behavior expectations.

**Step 3: Write minimal implementation**

- Implement command header, structured navigation, focused editing surface.
- Add persistent live preview panel (desktop + mobile approximation).
- Improve save state/last-updated feedback and unsaved-change signaling.

**Step 4: Verify**

Run:
- `npm test -- src/lib/adminApi.test.ts`
- `npm run typecheck`
- `npm run build`

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/AdminPanel.tsx src/components/AdminLogin.tsx src/components/AdminPreviewPanel.tsx src/App.tsx src/lib/adminApi.ts src/lib/adminApi.test.ts
git commit -m "feat: redesign admin console with black ledger control surface"
```

### Task 7: Final polish, accessibility pass, and full verification

**Files:**
- Modify: `README.md`
- Modify: `src/content/siteContent.ts` (if copy polish needed)
- Modify: `functions/api/health.ts` (only if deployment flags changed)

**Step 1: Verification-first check**

Run:
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected: PASS (captures regressions introduced by redesign).

**Step 2: Write minimal implementation**

- Update README with Black Ledger redesign notes and any changed content/admin guidance.
- Ensure health endpoint docs match current config expectations.

**Step 3: Manual smoke**

Verify:
- Public homepage renders new sequence correctly.
- `/#/admin` login, edit, preview, save, logout all work.
- Banner changes are visible publicly.
- Deterministic time prompts still bypass Gemini.
- Voice endpoint still returns playable audio.

**Step 4: Re-run full verification**

Run:
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected: PASS

**Step 5: Commit**

```bash
git add README.md src/content/siteContent.ts functions/api/health.ts
git commit -m "docs: finalize black ledger redesign deployment guidance"
```
