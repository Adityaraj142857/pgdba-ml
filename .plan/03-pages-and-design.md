# Pages & Design

## Sitemap

```
/                      About PGDBA (also the homepage)
/experiences/          Interview Experiences — defaults to most recent batch, year switcher
/experiences/[batch]/  One static page per batch (e.g. /experiences/2024-26/), deep-linkable
/admin/                Upload → map → preview → publish. Not in nav; footer link only.
```

Only **About** and **Interview Experiences** appear in the primary navigation, per the user's
explicit instruction. `/experiences/[batch]/` pages exist so a specific batch is shareable via
URL and indexable, but the switcher on `/experiences/` is the primary way visitors reach them —
navigating to a different year is a normal link click (static, instant — no SPA machinery
needed for something this simple).

## Visual / brand direction

- **Reuse existing brand assets as-is**: `images/pgdba-logo-...png` (transparent logo, for the
  navbar) and `images/pgdba-logo-FB-banner-size-V1.1.jpg` (banner, candidate for the About-page
  hero background or an Open Graph share image).
- **Color**: the old exports consistently use a green accent (`#0a5`) with a soft light-blue
  table header tint (`#e3f3fa`) — carry that DNA forward but refine it into a proper palette
  (a deeper professional green as primary, a warm neutral/charcoal for text, the light blue as
  a tint for badges/highlights) rather than reusing the raw hex values verbatim.
- **Type**: the newest source file (`2025-27.html`) already pairs **Playfair Display**
  (headings) with **Outfit** (body) — a good, already-`Google Fonts`-linked signal of a
  direction someone on the committee liked. Adopt that pairing as the default; it reads as
  academic-but-modern, fitting an ISI/IIM-Calcutta program.
- **Overall tone**: clean, editorial, generous whitespace, subtle card shadows — a university
  program site, not a startup landing page. No stock-photo hero clutter; let the logo, a short
  strong headline, and real data (batch count, profile count) carry the hero.

## `/` — About PGDBA

Sections, top to bottom:

1. **Hero** — logo, one-line program identity (e.g. "Post Graduate Diploma in Business
   Analytics — a joint program of ISI Kolkata and IIM Calcutta"), a primary CTA button to
   Interview Experiences.
2. **What is PGDBA** — program description. *(Content TODO — needs real copy from the user;
   placeholder text will be marked clearly in the source so it's impossible to ship
   accidentally.)*
3. **By the numbers** — a stat strip computed at build time from the batch data (e.g. "11
   batches," "500+ interview experiences shared," "2015 – present") rather than hardcoded, so
   it's automatically correct after every Admin publish.
4. **Why this site** — one short paragraph: alumni-run, free resource for aspirants, replacing
   the old WordPress site.
5. **Footer** — quick links (About, Interview Experiences), the quiet Admin link, contact/social
   if provided.

## `/experiences/` and `/experiences/[batch]/`

- **Year switcher**: a horizontal tab/pill bar across all 11 batches (oldest → newest, newest
  highlighted/default), each a plain link to `/experiences/[batch]/` — works with JS off,
  optionally enhanced with active-state styling via a tiny script.
- **Batch header**: batch label, a short stat row (profile count; average written/pre-interview
  score if present in that batch's data — narrative-era batches won't have these numbers and
  the row simply omits them).
- **Structured batches** (`table-stacked` / `table-kv` / `card-grid` source formats): responsive
  grid of `StudentCard` components — name, key badges (score, work-ex), and expandable sections
  for the question categories (general / math-stats / coding / GK / logical) and tips, so the
  card is scannable collapsed and complete expanded.
- **Narrative batches** (2015-17, 2016-18, 2017-19): rendered via `NarrativeArticle` — flowing
  magazine-style text preserving the original name/bio/quote structure and "Part 1 / Part 2"
  divisions, styled to match the rest of the site rather than looking like a pasted blog post.
- **Search/filter** (stretch goal, Phase 4): a client-side text filter box (by name/college/
  stream) and maybe a work-ex range filter, scoped to the currently viewed batch. Not required
  for MVP — flagged as an enhancement so it doesn't block launch.
- **Deep link to one profile** (stretch goal): anchor per card (`#name-slug`) so a specific
  student's experience can be linked directly, e.g. from a WhatsApp group.

## `/admin/`

Full flow detailed in [`04-admin-cms.md`](./04-admin-cms.md). Design-wise: deliberately plain
and utilitarian (this is a tool, not a showcase page) but still uses the same design system
(fonts/colors) so it doesn't look like a different site. Must clearly show, at every step, which
batch is about to be affected and give an unmistakable final confirmation before anything is
published.

## Component list

- `Navbar.astro` — logo + About / Interview Experiences links, responsive hamburger on mobile.
- `Footer.astro` — quick links, quiet Admin link, year/credit line.
- `StatStrip.astro` — reusable stat-row component (used on About and per-batch headers).
- `BatchSwitcher.astro` — the year tab/pill bar.
- `StudentCard.astro` — the structured-record card, also reused (imported) by the Admin
  preview step so what the admin sees while previewing is pixel-identical to what will go live.
- `NarrativeArticle.astro` — renders narrative-format batches.
- `BaseLayout.astro` — shared `<head>`, nav, footer wrapper.

## Bar for "very very presentable"

- Fully responsive: mobile (single column cards), tablet, desktop (multi-column grid) — checked
  by hand in a real browser before calling any page done, not just by reading the CSS.
- Lighthouse pass (performance/accessibility/best-practices/SEO) targeted in the high 90s —
  realistic for a mostly-static Astro site with system fonts fallback and optimized images.
- Proper `<title>`/meta description per page, Open Graph tags using the banner image, favicon
  from the logo.
- No layout-shift/broken-image placeholders; every image has explicit dimensions.
- Dark mode: nice-to-have, not required — flagged as a Phase 4 stretch item, not a blocker.
