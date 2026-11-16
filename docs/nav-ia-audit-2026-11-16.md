# sentientpartners.ai: navigation and information architecture review

**Date:** Mon Nov 16, 2026 (crawled about 2:35 to 2:50 AM PT)
**Scope:** live https://sentientpartners.ai at 1280×800 and 375×812, plus the PR #55 preview (https://codex-relay-voice-demos.sentient-partners-site.pages.dev/). Read-only. No code or site changes.
**Method:** Playwright crawl on the box (`nav-audit/crawl.py`, raw JSON in `nav-audit/raw/`), annotated screenshots (`nav-audit/shots.py`, `nav-audit/fix.py`), and a read of `thill1/sentient-partners-site` at `main` 019941f plus the PR #55 branch `codex/relay-voice-demos`.
**Trigger:** an outside review said the site is "too difficult to navigate and connect to our solutions, everything is nested or hard to get to." Recruiters and prospects use the site as a showcase.

**How to read "screens":** one screen is one viewport height (800 px desktop, 812 px mobile), measured from the top of the homepage. "Clicks" counts taps or clicks, including opening the mobile menu.

---

## 1. Summary

The site is beautifully built, but it's organized as **one long story page (about 16 screens on desktop, about 15 on mobile)**, not as a map of what Sentient Partners offers. The header is a table of contents for that page: 4 of its 6 items are same-page anchors. None of the 8 capabilities has its own page or URL. Each one is a slide inside a scroll-pinned carousel. Relay is about 9 screens down inside "Our work." The capabilities PDF is linked from nowhere. Field OS, Office OS and the Sentient OS showcase don't appear on the site at all. A visitor who wants to know "what do you do, and can I see it?" has to scroll through the whole story to find out.

The proposed fix keeps the hero, the brand and the story. It adds one **Solutions** destination: a hub plus one page per solution, linked directly from the header, the mobile menu and the footer. It gives Relay and the PR #55 demos their own URLs, and it makes the header, footer and Insights nav the same on every page.

---

## 2. Current sitemap (live, from crawl and code)

Routes come from `src/App.tsx` → `pageFor()`. Everything except `/tools/*`, `/insights/*`, `/privacy` and `/terms` renders the homepage. `public/sitemap.xml` lists only `/`, the 5 tools URLs, `/privacy` and `/terms`. It has no Insights and no solution URLs.

```
/  (homepage, Landing.tsx)                         desktop screen / mobile screen
├─ Hero: GoldenGate.tsx  "Global experience. Local impact." + tagline     0.3 / 0.3
│   └─ descent note link "See how we help" → #services
├─ #services   Outcomes.tsx  "Start where it hurts most."  (PINNED, ~3 screens on desktop)   1.0 / 1.0
│   ├─ Move forward with a practical plan → #process
│   ├─ Attract & Convert → #capabilities:websites
│   ├─ Automate & Communicate → #capabilities:ai-chatbots   ("See chat and voice assistants")
│   └─ Operate & Scale → #capabilities:business-apps
├─ #capabilities  Capabilities.tsx "One customer. Start to finish." (PINNED horizontal carousel, ~3.6 screens; 8 scenes; swipe carousel on mobile)  4.0 / 3.3
│   scenes (slug): 1 search · 2 websites · 3 ai-chatbots · 4 voice-agents · 5 scheduling · 6 business-apps · 7 automation · 8 reviews
│   each scene: demo, "See the details" toggle (MobileMore, collapsed on mobile), "Discuss <name>" → contact modal
├─ #work  WorkSection (Landing.tsx) "Built for the way business actually happens."   7.6 / 5.3
│   ├─ Field operations card · Customer experience card
│   └─ RelayShowcase.tsx "Sentient Relay · In pilot", "The service day, in one app."  9.1 / 7.0
│        └─ "Ask about Sentient Relay" → contact modal
├─ #founder  "Enterprise experience. Personal accountability."   9.8 / 8.4   (bio behind "Read Troy's full background" toggle on mobile)
├─ #process  "Clear thinking. Careful execution." Discover/Design/Deliver   11.0 / 10.2
├─ .tools-teaser (no id) "Free website check..." → /tools/          12.2 / 11.5
├─ #contact  Contact.tsx "Let's build what's next for your business."   12.3 / 11.6
├─ SignupBand.tsx (Insights newsletter, "Read recent issues" → /insights/)   14.5 / 12.6
└─ footer  FooterFinale + Explore / Let's connect / legal               15.3 / 13.7
Fixed on every homepage and tools view: ActionDock "Book a call" · "Ask Sentient" (chat/voice) · phone

/tools/  ToolsPage.tsx  "Tools for growing businesses."
├─ cards: Website check (→ #website-check, same page) · Missed-call calculator · AI readiness check · Time-back estimator · Reputation snapshot
├─ #templates "Take these with you." 6 template PDFs (/templates/*.pdf)
└─ #website-check  SiteCheck.tsx "How does your website hold up?"   3.7 / 4.1 screens down
/tools/missed-call-calculator/ · /tools/ai-readiness/ · /tools/time-back/ · /tools/reputation/
/insights/  (static, built by insights/build.mjs; its own header and footer)
├─ filters: All · Newsletter · Articles · Social  (/insights/newsletter/, /articles/, /social/)
└─ issue pages /insights/<slug>/
/capabilities.pdf   200 application/pdf, 2 pages (static in public/). Not linked from any page.
/privacy · /terms
#/admin  (hash route, admin login; not public nav)
404s checked: /relay, /solutions, /services, /tools/website-check/
```

PR #55 adds `#interactive-demos` "See the systems at work." (`InteractiveDemos.tsx`) between Capabilities and Our work. It sits at 7.6 screens on desktop and 5.8 on mobile. It has two toggle buttons, "Explore Sentient Relay · Nine app screens · In pilot" and "Read the voice example," and a 20-minute intro call link. PR #55 also adds an in-carousel link, "Explore the Relay and website voice demos below.", and a "Walk through the screens" link in the Relay card. It adds no nav, footer or URL entry.

### Navigation inventory

| Place | Items (live) |
|---|---|
| Desktop header (`Landing.tsx` `links`) | How we help `#services` · Capabilities `#capabilities` · Our work `#work` · Our founder `#founder` · Tools `/tools/` · Insights `/insights/` · logo `#top` · **Book an intro call** (cal.com) |
| Mobile menu (full-height overlay) | Same 6 links · Book a 20-minute intro call · phone. No solution is named. |
| Action dock (fixed) | Book a call · Ask Sentient (chat or voice) · phone |
| Homepage footer | Explore: How we help, Capabilities, Our work, Our founder, Our approach, Tools, Insights. Let's connect: phone, hello@, LinkedIn, Book a 20-minute intro call, Ask Sentient. Legal: Privacy, Terms |
| Insights header (`insights/build.mjs`) | Capabilities · Our work · Our founder · Insights · Book. **No How we help, no Tools. On mobile these links are hidden and there is no menu button.** |
| Insights footer | Home · Insights · hello@ · Privacy · Terms. No Capabilities, Tools, phone or Ask Sentient. |
| In-page CTAs | 8× "Discuss <capability>" (contact modal), "Play a sample call", "Ask about Sentient Relay", 3× "Book a 20-minute intro call" (founder, contact, footer), "Check your website", "Read recent issues" |

---

## 3. Click and scroll depth per solution

Desktop is 1280 wide and mobile is 375. Fastest path from the homepage top.

| Solution / asset | Desktop: fastest path | Desktop: scroll only | Mobile: fastest path | Mobile: scroll only | Where it lives | Has its own URL? |
|---|---|---|---|---|---|---|
| Services / How we help | 1 click (nav anchor) | 1.0 screen, then pinned ~3 screens | 2 taps (menu, link) | 1.0 | Pinned scroll stage | No (anchor) |
| Capabilities (overview) | 1 click (nav) | 4.0 | 2 taps | 3.3 | Pinned horizontal carousel | No (anchor) |
| **AI voice agent** | 1 click + 3 "next" clicks, or a hidden deep link `#capabilities:voice-agents` | ~5.4 (scene 4 of 8) | 2 taps + 3 swipes | 3.5 + 3 swipes | Carousel slide 4; "Play a sample call" inside it | No; deep link exists but nothing links to it |
| **AI chat assistant** | 1 click on "Ask Sentient" (live chat, always visible); demo is 1 click + 2 "next" | ~4.9 (scene 3) | 1 tap (dock); demo 2 taps + 2 swipes | 3.5 + 2 swipes | Dock pill (live) and carousel slide 3 | No |
| Other 6 capabilities (search, websites, scheduling, business apps, automation, reviews) | 1 click + 0 to 7 "next" clicks | 4.0 to ~7.2 | 2 taps + 0 to 7 swipes | 3.3 + swipes | Carousel slides 1, 2, 5 to 8 | No |
| **Sentient Relay (in pilot)** | 1 click ("Our work") + ~1.5 screens | **9.1** | 2 taps + ~1.7 screens | **7.0** | Third block inside #work | No |
| Relay walkthrough (PR #55) | Scroll + 1 toggle click | 7.6 + click | Scroll + 1 tap | 5.8 + tap | #interactive-demos toggle | No |
| Voice example (PR #55) | Scroll + 1 toggle click | 7.6 + click | Scroll + 1 tap | 5.8 + tap | #interactive-demos toggle | No |
| **Website check** | 2 clicks (Tools, then Website check card) | 12.2 to the teaser, then a click, then 3.7 more on /tools/ | 3 taps | 11.5 + 4.1 | One-line teaser on home; 5th block of /tools/ | No (`/tools/#website-check` only) |
| Other free tools | 2 clicks | 12.2 + click | 3 taps | 11.5 + tap | /tools/ cards | Yes |
| Insights | 1 click | 14.5 (signup band) | 2 taps | 12.6 | Header and footer | Yes |
| **Capabilities PDF** | **Not reachable**: 0 links on home, /tools/ and /insights/ (crawl found no `a[href*="capabilities.pdf"]`); direct URL only | n/a | Not reachable | n/a | `public/capabilities.pdf` (200, 2 pages) | Yes, but orphaned |
| **Field OS** | **Not on the site** (0 mentions in DOM and source) | n/a | n/a | n/a | Nearest is "Field operations" card in #work and "Business Applications" slide | No |
| **Office OS** | **Not on the site** | n/a | n/a | n/a | n/a | No |
| **Sentient OS showcase** | **Not on the site** | n/a | n/a | n/a | n/a | No |
| Book a 20-minute intro call | 1 click (header or dock) | 0 | 1 tap (dock) | 0 | Header, dock, founder, contact, footer | cal.com |
| Phone / Ask Sentient | 1 click (dock) | 0 | 1 tap | 0 | Dock | n/a |

The homepage is 12,708 px tall on desktop (15.9 screens) and 11,863 px on mobile (14.6). PR #55 makes it 16.6 and 15.6 screens. Insights' index is 36.6 screens on desktop because its cards are full width (that constraint stays) and all issues load on one page.

---

## 4. Top problems, ranked by impact

1. **Solutions have nowhere to live (highest impact).** All 8 capabilities exist only as slides in one scroll-pinned carousel. The header item "Capabilities" lands on slide 1. Voice is slide 4, and business apps is slide 6. No solution has a page, URL, title or meta description, so a recruiter or prospect can't share "here's the voice agent," and search engines can't index it. The `#capabilities:<slug>` deep links work (screenshot 02b) but nothing links to them. *Screens 01, 02, 02b, 09.*
2. **The strongest proof points are buried or missing.** Relay (in pilot) is the third block of "Our work," about 9 screens down on desktop and 7 on mobile. The capabilities PDF is linked from nowhere. Field OS, Office OS and the Sentient OS showcase aren't on the site at all, so the "intelligent systems" half of the tagline has no showcase. PR #55 helps by moving the demos up to about 7.6 screens, but they're still reachable only by scrolling. *Screens 03, 05, 10, 11.*
3. **The nav is a table of contents for one long page, not a map of the business.** 4 of 6 header items are same-page anchors. The homepage is about 16 screens, and two pinned sections (Outcomes about 3 screens, Capabilities about 3.6) take over the scroll wheel. A visitor who misses the right anchor scrolls through everything. On mobile, the full-height menu lists the same 6 anchors and names no solution. *Screens 01, 07, 08.*
4. **Navigation changes from page to page.** Insights has a different header (no How we help or Tools) and footer (no Capabilities, Tools, phone or Ask Sentient), and no action dock. **On mobile Insights there is no menu at all**, only the logo and Book. That breaks the enterprise-grade feel the moment someone follows a LinkedIn post into Insights.
5. **The website check and resources are hard to find.** The website check is a one-line strip at about 12 screens. On /tools/ it's the fifth block, about 4 screens down, and it has no URL of its own. "See chat and voice assistants" lands on the chat slide, and voice is one more slide over. *Screens 04, 06.*

---

## 5. Proposed structure

**One paragraph:** keep the homepage as the story. Add a real **Solutions** layer: a `/solutions/` hub, one page per solution using the existing capability copy, "includes" lists and demo components, and `/relay/` for Sentient Relay (in pilot). Every solution is then one click from the header (desktop panel), one level in the mobile menu (shown as a flat grouped list, not an accordion), and one click from a new footer Solutions column. Give the PR #55 demos a URL (`/demos/`), give the website check a URL (`/tools/website-check/`), and link `/capabilities.pdf` from the Solutions panel, the hub and the footer. Swap a scannable "Solutions at a glance" grid in near the top of the homepage so every solution shows within about 2 screens. Use one shared header and footer on every page, including Insights.

### 5.1 Header (desktop)

Six items, each going to a real destination, plus the CTA on the right. The logo stays centered and the right CTA is unchanged.

| # | Label | Target | Notes |
|---|---|---|---|
| 1 | **Solutions ▾** | `/solutions/` (click) · panel on hover or focus | Panel is a single open layer, keyboard accessible, not nested. Columns use the existing outcome groups: **Advisory & planning** (Business strategy → `/solutions/advisory/`, uses the existing "How we partner" Discover/Design/Deliver copy) · **Attract & convert** (Premium websites, Search visibility) · **Automate & communicate** (AI chat assistants, AI voice agents, Calendar & scheduling, Reputation & reviews) · **Operate & scale** (Business applications, Workflow automation) · **Products** (Sentient Relay · *In pilot* → `/relay/`). Panel footer: "Download the capabilities overview (PDF)" → `/capabilities.pdf` · "See the demos" → `/demos/` |
| 2 | **Demos** | `/demos/` | PR #55 section on its own page; `?demo=relay` and `?demo=voice` open each one. The homepage keeps the section with id `demos` |
| 3 | **Our work** | `/#work` | Relay card links to `/relay/` |
| 4 | **About** | `/#founder` | Renamed from "Our founder"; same section |
| 5 | **Insights** | `/insights/` | |
| 6 | **Free tools** | `/tools/` | Website check is the first card and goes to `/tools/website-check/` |
| CTA | **Book an intro call** | cal.com 20-minute | Unchanged |

"How we help" leaves the header because it duplicates Solutions. It stays as the hero's "See how we help" link and in the footer.

### 5.2 Mobile menu (375)

It stays a full-height overlay with focus trap and Escape, as today. The order:
1. **Solutions** heading, followed by a flat grouped list, always expanded with no accordion: Business strategy · Premium websites · Search visibility · AI chat assistants · AI voice agents · Calendar & scheduling · Reputation & reviews · Business applications · Workflow automation · Sentient Relay *(in pilot)* · All solutions →
2. Demos · Our work · About · Insights · Free tools
3. "Capabilities overview (PDF)" small link
4. CTA block (unchanged pattern, mirroring the dock): **Book a 20-minute intro call** · **Ask Sentient** · phone

If the list feels long, use two short columns at 375 for the 9 capability links. Don't collapse them, because collapsing is the "nested" problem.

### 5.3 Homepage section order

| # | Section | Change |
|---|---|---|
| 1 | Hero (GoldenGate) | **No change.** H1 and tagline stay left-aligned in their current position. Hero CTAs keep mirroring the dock: Book a call · Ask Sentient pill · phone |
| 2 | How we help (#services, Outcomes) | Keep. Each row's link goes to its solution page or group on `/solutions/`, with the in-page carousel as fallback. "See chat and voice assistants" points to `/solutions/` with the Automate & communicate group |
| 3 | **NEW: Solutions at a glance** (`#solutions`) | Static grid with no pinning: 8 capability cards plus a Relay *in pilot* card. Each card has the existing name, one-line copy and a "Learn more" link to its page. Ends with "Download the capabilities overview (PDF)." This is the fix for "hard to connect to our solutions" |
| 4 | Capabilities journey (#capabilities carousel) | Keep as the story, retitled as the end-to-end example. Consider a "Skip the story" link to #demos so the pinned scroll isn't a trap |
| 5 | Demos (#demos, from PR #55) | Keep where PR #55 puts it |
| 6 | Our work (#work) | Keep. Relay card adds "Relay overview" → `/relay/` |
| 7 | About / founder (#founder) | Keep |
| 8 | Process (#process) | Keep |
| 9 | Website check teaser | Keep, linked to `/tools/website-check/` |
| 10 | Contact (#contact) | Keep, with the 20-minute intro call |
| 11 | Insights signup band | Keep |

Net effect: every solution has a visible, named link within about 2 screens instead of up to 9, and the page gets only about 1 screen longer.

### 5.4 Footer (every page, including Insights)

Four columns, plus the existing tagline and place block:
- **Solutions:** the 9 capability pages · Sentient Relay *(in pilot)* · All solutions
- **Company:** How we help · Our work · About · Our approach · Insights
- **Resources:** Free tools · Website check · Demos · Capabilities overview (PDF) · Templates (`/tools/#templates`)
- **Let's connect:** Book a 20-minute intro call · Ask Sentient (chat or voice) · phone · hello@sentientpartners.ai · LinkedIn
- Legal: Privacy · Terms

### 5.5 Solution page template (`/solutions/<slug>/`)

It reuses only existing, approved content, with no new claims: the capability `name`, `copy`, `includes[]` and `Demo` from `Capabilities.tsx`/`capabilityDemos.tsx`, plus the matching "behind the scenes" panel. Page layout: H1 (name) → one-paragraph summary → live demo → what's included → "Discuss <name>" (existing contact modal) and **Book a 20-minute intro call** → related solutions (same group) → PDF link. Use the existing slugs: `search`, `websites`, `ai-chatbots`, `voice-agents`, `scheduling`, `business-apps`, `automation`, `reviews`. Optionally give `ai-chatbots` a prettier public slug like `chat-assistants` and add a 301. `/relay/` reuses the RelayShowcase copy and PR #55's RelayWalkthrough, labeled *In pilot*.

### 5.6 Implementation notes (for the build step; nothing done yet)

- Routing: extend `pageFor()` in `src/App.tsx` the same way `/tools/*` works (path-based pages rendered by `Landing.tsx`). Make the `links` array and the footer one shared config, and make `insights/build.mjs` read the same config so Insights stops drifting. Add the mobile menu button to Insights.
- Keep `#capabilities:<slug>` deep links working. Keep `/capabilities.pdf` as the same static file in `public/` (the middleware's www→apex redirect is unaffected).
- Add the new URLs to `public/sitemap.xml` and `public/llms.txt`. Insights URLs are also missing from the sitemap today.
- Track clicks with the existing `track()` (already has a `capabilities_pdf` event).
- Copy rules apply to all new labels: consultancy and business-advisory voice, the tagline exactly as written, "in pilot" for Relay, the 20-minute intro call, hello@ only, never "AI-First Agency" or "audit," and no invented claims.

---

## 6. Decisions for Troy (with a recommended call)

1. **Field OS, Office OS, Sentient OS showcase:** they aren't on the site today and there's no approved public copy. *Recommend:* launch Solutions with the 9 existing items plus Relay, and add a "Products" entry for each OS only after you approve its copy and screenshots. That avoids invented claims.
2. **One page per solution vs. anchors only:** *Recommend pages.* They're shareable for recruiters, indexable, and give each solution a real "place."
3. **Keep the pinned Capabilities carousel on the homepage?** *Recommend keeping it* as the story, below the new grid, with a skip link.
4. **Rename "Our founder" to "About" and add "Demos" to the header:** *Recommend yes,* with Demos going live together with PR #55.
5. **"How we help" out of the header:** *Recommend yes.* Solutions replaces it, and it stays in the hero link and the footer.

---

## 7. Annotated screenshots (`/workspace/sentient-dev-review/nav-audit/`)

| File | Shows |
|---|---|
| `01-desktop-header.png` | Header: 6 items, 4 of them anchors, no Solutions; hero and CTA bar |
| `02-desktop-capabilities-carousel.png` | All capabilities live inside one pinned carousel |
| `02b-desktop-voice-deeplink.png` | Voice agent = scene 4 of 8; the deep link works but is unlinked |
| `03-desktop-relay-in-work.png` | Relay (in pilot) about 9 screens down inside Our work |
| `04-desktop-website-check-teaser.png` | Website check as a one-line strip about 12 screens down |
| `05-desktop-footer.png` | Footer repeats the anchors; no Solutions, PDF or Relay |
| `06-desktop-tools.png` | /tools/: website check is a same-page hash, about 3.7 screens down |
| `07-mobile-fold.png` | Mobile fold: hamburger plus CTA bar (keep) |
| `08-mobile-menu-open.png` | Mobile menu: same 6 links, no solution named |
| `09-mobile-capabilities.png` | Mobile carousel, details collapsed behind "See the details" |
| `10-pr55-desktop-demos.png` / `11-pr55-mobile-demos.png` | PR #55 demos: well placed but reachable only by scrolling |
| `raw/*.json`, `raw/*-fold.png` | Full crawl data (sections, headings, every link and button with position and context) |

Caveats: screen depths are measured from the DOM after a full scroll pass. Pinned sections are counted at their layout height, so the actual scroll distance can vary slightly with scroll speed. PR #55's preview has no back-end features, so chat and voice there weren't exercised.
