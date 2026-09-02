# Roadmap

Work through these phases in order. Each phase should be genuinely working/deployed before
moving to the next — especially Phase 0, which exists purely to prove the free-hosting pipeline
works before any real content or design effort is spent.

## Phase 0 — Skeleton & hosting proof

- [x] Scaffold Astro project (Tailwind added).
- [ ] Confirm GitHub repo name/visibility with the user, add `.github/workflows/deploy.yml`
      and the correct `astro.config.mjs` base — **blocked on repo name**.
- [ ] Deploy a placeholder page to GitHub Pages and confirm the live URL actually loads.
- [x] Move `Interview_Experiences/` and `Excel/` into `archive/`; move `images/` into
      `public/images/`.

## Phase 1 — Data migration

- [x] Write `src/lib/schema.ts` (Zod schema) and `src/lib/header-aliases.ts`.
- [x] Write `scripts/migrate-html-batches.ts` with the format adapters — narrative,
      narrative-numbered (2017-19's distinct format), table-stacked, table-kv, card-grid.
- [x] Run migration, generate `src/data/batches/*.json` for all 11 batches (486 records total).
- [x] Spot-check output against source; fixed several real bugs along the way (dead
      `linkUrl` href-vs-text, list items running together, "0" scores that meant "blank",
      ALL-CAPS names, "2022.0" year artifacts).
- [x] Wire up Astro content collection (`src/content.config.ts`) so `astro build` validates
      the data.
- [x] Shared coercion logic factored into `src/lib/record-fields.ts`, reused by both the
      migration script and the admin CMS.

## Phase 2 — About page

- [x] Build `Navbar`, `Footer`, `BaseLayout`, `StatStrip`.
- [x] Build `/` (About/homepage) with placeholder copy clearly marked `TODO`.
- [ ] Get real PGDBA program copy from the user, replace placeholders.

## Phase 3 — Interview Experiences pages

- [x] Build `StudentCard`, `NarrativeArticle`, `BatchSwitcher`.
- [x] Build `/experiences/[batch]/` via `getStaticPaths` over all batches.
- [x] Build `/experiences/` index defaulting to the latest batch.
- [x] Confirm narrative-era batches (2015-17/2016-18/2017-19) render legibly via
      `NarrativeArticle`.
- [x] Search/filter within a batch (client-side, name/college/stream) — built ahead of
      schedule since it was low-effort.

## Phase 4 — Design polish & QA

- [x] Responsive pass (mobile/desktop) checked in an actual browser — hero background bug
      found and fixed (banner image's own baked-in text was clashing with the page's H1).
- [ ] Tablet-width check specifically; Lighthouse pass; fix anything below the high-90s bar.
- [x] Meta tags, Open Graph image, favicon.
- [ ] (Stretch) per-profile deep links.

## Phase 5 — Admin CMS

- [x] Build `/admin/` upload → SheetJS parse → column-mapping UI → Zod-validated preview →
      GitHub API publish (branch + PR). (Preview cards are a hand-built template mirroring
      `StudentCard`'s markup, not a literal import of the `.astro` component — Astro has no
      client framework installed, so a true component-reuse would have meant adding one just
      for this; the plan's intent — "admin sees exactly what will render" — is preserved.)
- [x] `src/lib/github-api.ts` wrapper (create branch, commit file, open PR). Fixed a real bug
      here: `encodeURIComponent()` on the *whole* file path would have turned "/" into "%2F"
      and broken every Contents API call — now encodes per-segment.
- [x] End-to-end test (upload → mapping → preview) using the real sample
      `archive/Excel/PGDBA Batch 9...xlsx` file through the actual browser UI: all 59 rows
      parsed, auto-mapped, and validated correctly, matching the source spreadsheet exactly.
- [ ] End-to-end test of the final **publish** step (branch/commit/PR) — **not yet possible,
      no live GitHub repo exists for this project yet.** Do this as soon as Phase 0 unblocks.
- [ ] Write a short "How to publish a new batch" doc for whoever runs this next year (PAT
      generation steps, where the footer link lives, what a healthy PR looks like).

## Phase 6 — Cross-cutting QA

- [ ] Broken-link check across all 11 batches' external links (LinkedIn/Facebook profile URLs
      carried over from the source HTML).
- [ ] Accessibility check (keyboard nav, contrast, alt text).
- [ ] Confirm branch protection on `main` is actually configured as intended.

## Phase 7 — Launch

- [ ] Final review with the user of the live GitHub Pages URL.
- [ ] (Optional) point the previously-owned `aspirants.pgdba.ml` domain at the new site.
- [ ] Announce/replace any old links pointing at the closed WordPress site.
