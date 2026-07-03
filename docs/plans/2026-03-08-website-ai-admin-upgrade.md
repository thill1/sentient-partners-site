# Sentient Partners Website AI/Admin Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a lightweight admin for banner and AI settings, make time/timezone answers deterministic, and replace browser-selected voice playback with a consistent server-backed voice path.

**Architecture:** Keep the site on Cloudflare Pages + Functions. Store editable settings in a single Cloudflare KV record, protect admin APIs with cookie-based auth backed by environment secrets, intercept time/timezone requests before calling Gemini, and route voice playback through a new `/api/voice` proxy that can call a hosted open-source TTS service.

**Tech Stack:** React 18, TypeScript, Vite, Cloudflare Pages Functions, Cloudflare KV, browser Speech Recognition, hosted open-source TTS, Vitest for utility tests.

---

### Task 1: Add verification and test foundation

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `tsconfig.functions.json`
- Create: `vitest.config.ts`
- Create: `src/lib/timezone.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { formatCurrentTimeForLocation, convertTimeBetweenZones } from './timezone';

describe('timezone helpers', () => {
  it('formats the current time for Tokyo', () => {
    const result = formatCurrentTimeForLocation('Tokyo');
    expect(result.timeZone).toBe('Asia/Tokyo');
    expect(result.label).toContain('Tokyo');
  });

  it('converts time between New York and Tokyo', () => {
    const result = convertTimeBetweenZones('2:00 PM', 'America/New_York', 'Asia/Tokyo');
    expect(result.sourceTimeZone).toBe('America/New_York');
    expect(result.targetTimeZone).toBe('Asia/Tokyo');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/timezone.test.ts`

Expected: FAIL because `timezone.ts` and the test script do not exist yet.

**Step 3: Write minimal implementation**

- Add `vitest` to `devDependencies`.
- Add scripts:
  - `test`: `vitest run`
  - `typecheck`: `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.functions.json --noEmit`
- Create `tsconfig.functions.json` that includes `functions/**/*.ts`.
- Create `vitest.config.ts` for a simple Node test environment.
- Add a minimal `src/lib/timezone.ts` exporting `formatCurrentTimeForLocation` and `convertTimeBetweenZones`.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/timezone.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.functions.json vitest.config.ts src/lib/timezone.ts src/lib/timezone.test.ts
git commit -m "test: add verification for timezone helpers"
```

### Task 2: Add Cloudflare settings storage and admin auth utilities

**Files:**
- Create: `wrangler.jsonc`
- Create: `functions/lib/adminAuth.ts`
- Create: `functions/lib/siteSettings.ts`
- Create: `functions/lib/http.ts`
- Create: `functions/types.ts`
- Test: `src/lib/siteSettingsSchema.test.ts`
- Create: `src/lib/siteSettingsSchema.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { normalizeSiteSettings } from './siteSettingsSchema';

describe('normalizeSiteSettings', () => {
  it('fills defaults for missing banner and ai fields', () => {
    const result = normalizeSiteSettings({});
    expect(result.banner.message).toBe('Free AI Opportunity Review');
    expect(result.ai.voiceEnabled).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/siteSettingsSchema.test.ts`

Expected: FAIL because the schema module does not exist yet.

**Step 3: Write minimal implementation**

- Create `src/lib/siteSettingsSchema.ts` with:
  - `SiteSettings` type
  - default settings
  - `normalizeSiteSettings(input)` validator/normalizer
- Create `functions/lib/siteSettings.ts` with:
  - `getSiteSettings(env)`
  - `saveSiteSettings(env, settings)`
  - single KV key such as `site_settings`
- Create `functions/lib/adminAuth.ts` with:
  - login credential validation against env vars
  - cookie signing and verification using `ADMIN_SESSION_SECRET`
- Create `functions/lib/http.ts` for JSON helpers and cookie helpers.
- Add `wrangler.jsonc` with a KV binding placeholder like `SITE_SETTINGS`.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/siteSettingsSchema.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add wrangler.jsonc functions/lib/adminAuth.ts functions/lib/siteSettings.ts functions/lib/http.ts functions/types.ts src/lib/siteSettingsSchema.ts src/lib/siteSettingsSchema.test.ts
git commit -m "feat: add admin auth and site settings foundation"
```

### Task 3: Build admin APIs for login, logout, and settings

**Files:**
- Create: `functions/api/admin/login.ts`
- Create: `functions/api/admin/logout.ts`
- Create: `functions/api/admin/settings.ts`
- Modify: `public/_routes.json`
- Test: `src/lib/adminApi.test.ts`
- Create: `src/lib/adminApi.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { mergeSettingsUpdate } from './adminApi';

describe('mergeSettingsUpdate', () => {
  it('overrides banner fields without removing unrelated ai settings', () => {
    const result = mergeSettingsUpdate(
      { banner: { enabled: true, message: 'A', ctaText: 'B', ctaUrl: '#', variant: 'info' }, ai: { voiceEnabled: true, voiceId: 'default', systemPrompt: 'x', siteMemory: 'y', voiceProvider: 'self_hosted_tts' } },
      { banner: { message: 'New banner' } }
    );

    expect(result.banner.message).toBe('New banner');
    expect(result.ai.voiceId).toBe('default');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/adminApi.test.ts`

Expected: FAIL because the admin API client/helper does not exist yet.

**Step 3: Write minimal implementation**

- Create `functions/api/admin/login.ts`:
  - accept username/password
  - verify against env credentials
  - set HTTP-only session cookie
- Create `functions/api/admin/logout.ts`:
  - clear session cookie
- Create `functions/api/admin/settings.ts`:
  - `GET` returns normalized settings for authenticated admin
  - `PUT` persists validated settings for authenticated admin
- Update `public/_routes.json` if needed so these API routes remain reachable.
- Create `src/lib/adminApi.ts` with fetch helpers and `mergeSettingsUpdate`.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/adminApi.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add functions/api/admin/login.ts functions/api/admin/logout.ts functions/api/admin/settings.ts public/_routes.json src/lib/adminApi.ts src/lib/adminApi.test.ts
git commit -m "feat: add admin settings api"
```

### Task 4: Add the admin UI and wire the header banner to settings

**Files:**
- Create: `src/components/AdminPanel.tsx`
- Create: `src/components/AdminLogin.tsx`
- Create: `src/hooks/useSiteSettings.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/types.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { getBannerDisplayState } from './useSiteSettings';

describe('getBannerDisplayState', () => {
  it('returns hidden when banner is disabled', () => {
    const result = getBannerDisplayState({
      banner: { enabled: false, message: 'x', ctaText: 'y', ctaUrl: '#', variant: 'info' },
      ai: { voiceEnabled: true, voiceId: 'default', systemPrompt: 'x', siteMemory: 'y', voiceProvider: 'self_hosted_tts' }
    });

    expect(result.visible).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/useSiteSettings.test.ts`

Expected: FAIL because the hook/helper does not exist yet.

**Step 3: Write minimal implementation**

- Create `src/hooks/useSiteSettings.ts` to load public settings and expose helpers like `getBannerDisplayState`.
- Add `AdminLogin` and `AdminPanel` components behind a route or a hidden launcher path such as `/#/admin` or `/admin`.
- Update `src/App.tsx` to render the admin route and provide settings context/state.
- Update `src/components/Header.tsx` to:
  - remove the hard-coded expired promo
  - render the banner only when enabled
  - show admin-managed message and CTA
- Seed the default banner to `Free AI Opportunity Review`.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/useSiteSettings.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/AdminPanel.tsx src/components/AdminLogin.tsx src/hooks/useSiteSettings.ts src/hooks/useSiteSettings.test.ts src/App.tsx src/components/Header.tsx src/types.ts
git commit -m "feat: add admin-managed site banner"
```

### Task 5: Add deterministic world-time and timezone conversion helpers

**Files:**
- Modify: `src/lib/timezone.ts`
- Create: `functions/lib/timeIntent.ts`
- Modify: `functions/api/gemini.ts`
- Test: `functions/lib/timeIntent.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { resolveTimeIntent } from './timeIntent';

describe('resolveTimeIntent', () => {
  it('detects a current-time request for Tokyo', () => {
    const result = resolveTimeIntent('What time is it in Tokyo right now?');
    expect(result?.kind).toBe('current_time');
    expect(result?.targetTimeZone).toBe('Asia/Tokyo');
  });

  it('detects a conversion request', () => {
    const result = resolveTimeIntent('If it is 3 PM in Tokyo, what time is it in Madrid?');
    expect(result?.kind).toBe('conversion');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- functions/lib/timeIntent.test.ts`

Expected: FAIL because the parser/interceptor does not exist yet.

**Step 3: Write minimal implementation**

- Create `functions/lib/timeIntent.ts` with:
  - common city/country aliases to IANA timezones
  - intent parsing for current-time and conversion requests
  - formatter helpers that return structured deterministic answers
- Update `functions/api/gemini.ts` so it:
  - checks for a time intent before calling Gemini
  - returns a concise natural-language answer directly when a time intent is found
  - otherwise falls back to Gemini as it does now

**Step 4: Run test to verify it passes**

Run: `npm test -- functions/lib/timeIntent.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/timezone.ts functions/lib/timeIntent.ts functions/lib/timeIntent.test.ts functions/api/gemini.ts
git commit -m "feat: make time answers deterministic"
```

### Task 6: Replace browser TTS with a server-backed `/api/voice` flow

**Files:**
- Create: `functions/api/voice.ts`
- Create: `functions/lib/voiceProxy.ts`
- Modify: `src/services/geminiService.ts`
- Modify: `src/components/ChatInterface.tsx`
- Modify: `src/vite-env.d.ts`
- Test: `src/lib/voicePlayback.test.ts`
- Create: `src/lib/voicePlayback.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createVoiceRequestBody } from './voicePlayback';

describe('createVoiceRequestBody', () => {
  it('includes the configured voice id and text', () => {
    expect(
      createVoiceRequestBody('Hello there', { voiceId: 'default-natural-voice' })
    ).toEqual({
      text: 'Hello there',
      voiceId: 'default-natural-voice'
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/voicePlayback.test.ts`

Expected: FAIL because the voice request helper does not exist yet.

**Step 3: Write minimal implementation**

- Create `functions/api/voice.ts` to accept `{ text, voiceId }`.
- Create `functions/lib/voiceProxy.ts` to forward requests to the external TTS service defined in env vars such as:
  - `TTS_BASE_URL`
  - `TTS_API_KEY` if needed
- Update `src/services/geminiService.ts` with a new helper like `requestVoiceAudio(text, voiceId)`.
- Update `src/components/ChatInterface.tsx` to:
  - remove browser `speechSynthesis` usage
  - request audio from `/api/voice`
  - play returned audio with `Audio` or a managed `HTMLAudioElement`
  - keep browser microphone input and transcript flow
  - read `voiceEnabled` and `voiceId` from settings
- Update `src/vite-env.d.ts` only if extra env typing is needed client-side.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/voicePlayback.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add functions/api/voice.ts functions/lib/voiceProxy.ts src/services/geminiService.ts src/components/ChatInterface.tsx src/lib/voicePlayback.ts src/lib/voicePlayback.test.ts src/vite-env.d.ts
git commit -m "feat: add consistent server-backed voice playback"
```

### Task 7: Final verification and deployment readiness

**Files:**
- Modify: `README.md`
- Modify: `functions/api/health.ts`

**Step 1: Write the failing test**

There is no new automated test for this task. Treat verification as command-level checks and manual smoke testing.

**Step 2: Run verification to identify gaps**

Run:
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected: any failures reveal missing imports, typing errors, or route regressions.

**Step 3: Write minimal implementation**

- Update `README.md` with:
  - required Cloudflare KV binding
  - required admin env vars
  - required TTS env vars
  - local development notes
- Update `functions/api/health.ts` to report the presence of key bindings and env vars without leaking secrets.

**Step 4: Run manual smoke verification**

Run the app and confirm:
- banner content updates from admin
- admin login/logout works
- "What time is it in Tokyo?" returns a deterministic answer
- "If it is 3 PM in Tokyo, what time is it in Madrid?" returns a conversion
- voice replies play with the same configured voice

Suggested commands:
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected: PASS for commands and successful manual smoke checks.

**Step 5: Commit**

```bash
git add README.md functions/api/health.ts
git commit -m "docs: add admin and voice deployment guidance"
```

## Deployment Notes

- Cloudflare env vars:
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD_HASH` or `ADMIN_PASSWORD`
  - `ADMIN_SESSION_SECRET`
  - `API_KEY` or `GEMINI_API_KEY`
  - `TTS_BASE_URL`
  - `TTS_API_KEY` if required
- Cloudflare binding:
  - `SITE_SETTINGS` KV namespace
- First settings seed should include:
  - banner message `Free AI Opportunity Review`
  - `voiceEnabled: true`
  - a default natural `voiceId`

## Manual Acceptance Criteria

- The expired hard-coded top banner no longer appears.
- Banner text and CTA can be edited without code changes.
- Admin access requires authentication.
- Basic time and timezone questions work reliably.
- Voice replies no longer use browser `speechSynthesis`.
- All visitors hear the same configured voice.
