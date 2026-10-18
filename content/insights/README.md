# Insights content guide

Every file in this folder is one item in the Insights hub at `/insights/`.
Bots and people hand off a Markdown file with YAML front matter. The build
turns it into a static page and an archive card. `README.md` is ignored.

**File name:** `YYYY-MM-DD-<slug>.md`. **Slug:** lowercase letters, digits and hyphens.

## Publishing gate

- `status: draft` is visible only in preview builds (`INSIGHTS_INCLUDE_DRAFTS=1`), with a "Draft" tag.
- `status: approved` is published on the live site and listed in the sitemap.
- Only Troy approves. Bots always hand off `status: draft`.
- `sample: true` (or a slug starting with `sample-`) marks a layout fixture. It never ships to production, even if approved.

## Fields for every type

| Field | Required | Notes |
|---|---|---|
| `type` | no | `newsletter` (default), `article`, `linkedin`, `x`, `facebook`, `instagram` |
| `slug` | yes | Page URL: `/insights/<slug>/` |
| `date` | yes | `YYYY-MM-DD`, used for newest-first order |
| `status` | yes | `draft` or `approved` |
| `summary` or `excerpt` | see below | Card text and meta description |
| `image` | no | Site path for the share image, for example `/insights/img/x.jpg` |
| `tags` | no | List, for example `[pricing, google-ads]` |
| `reading_minutes` | no | Shown on cards and pages |

## Newsletter (`type: newsletter`): Newsletter Bot

Required: `title`, `slug`, `issue` (number), `date`, `summary`, `status`.
Body: Markdown. A leading `> ...` blockquote renders as the editor's note.
A `## Sources` heading starts the smaller sources block.

```yaml
---
title: "Gas up 9%, hiring flat: reprice Q4"
slug: "issue-05-example"
type: newsletter
issue: 5
date: 2026-10-29
summary: "One or two sentences."
reading_minutes: 5
status: draft
---
```

## Article (`type: article`): blog posts

Same as a newsletter but with no `issue` number. Required: `title`, `slug`, `date`, `summary`, `status`.

## Social post (`type: linkedin | x | facebook | instagram`): LinkedIn Bot and others

Required: `slug`, `date`, `status`, and `external_url` (https link to the original post).
Optional: `title` (defaults to the post's first line), `excerpt` (defaults to the first paragraph).
Body: the post text in plain Markdown. No embed code: the page shows the text
and a "View on LinkedIn" (or X, Facebook, Instagram) link to the original.

```yaml
---
slug: "linkedin-2026-10-20-missed-calls"
type: linkedin
date: 2026-10-20
external_url: "https://www.linkedin.com/posts/..."
excerpt: "Optional card text."
status: draft
---
Post text here.
```

## House rules

- No invented claims, client results or testimonials. Follow the do-not-claim list in the capabilities doc.
- Banned on the site: "audit", "AI First Agency", any troyhill@ address. Use hello@sentientpartners.ai.
- The page adds the booking button ("Book a 20-minute introductory call") automatically.
