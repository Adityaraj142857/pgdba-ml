# Roadmap

Work through these phases in order. Each phase should be genuinely working/deployed before
moving to the next — especially Phase 0, which exists purely to prove the free-hosting pipeline
works before any real content or design effort is spent.

## Phase 0 — Skeleton & hosting proof

- [ ] Confirm GitHub repo name/visibility with the user (see open item in `README.md`).
- [ ] Scaffold Astro project, `.github/workflows/deploy.yml`, correct `astro.config.mjs` base.
- [ ] Deploy a placeholder page to GitHub Pages and confirm the live URL actually loads.
- [ ] Move `Interview_Experiences/` and `Excel/` into `archive/`; move `images/` into
      `public/images/`.

## Phase 1 — Data migration

- [ ] Write `src/lib/schema.ts` (Zod schema) and `src/lib/header-aliases.ts`.
- [ ] Write `scripts/migrate-html-batches.mjs` with the 4 format adapters
      (narrative / table-stacked / table-kv / card-grid).
- [ ] Run migration, generate `src/data/batches/*.json` for all 11 batches.
- [ ] Spot-check output against source for at least 3 records per batch; fix adapter bugs.
- [ ] Wire up Astro content collection using the schema so `astro build` validates the data.

## Phase 2 — About page

- [ ] Build `Navbar`, `Footer`, `BaseLayout`, `StatStrip`.
- [ ] Build `/` (About/homepage) with placeholder copy clearly marked `TODO`.
- [ ] Get real PGDBA program copy from the user, replace placeholders.

## Phase 3 — Interview Experiences pages

- [ ] Build `StudentCard`, `NarrativeArticle`, `BatchSwitcher`.
- [ ] Build `/experiences/[batch]/` via `getStaticPaths` over all batches.
- [ ] Build `/experiences/` index defaulting to the latest batch.
- [ ] Confirm narrative-era batches (2015-17/2016-18/2017-19) render legibly via
      `NarrativeArticle`.

## Phase 4 — Design polish & QA

- [ ] Full responsive pass (mobile/tablet/desktop) checked in an actual browser.
- [ ] Lighthouse pass; fix anything below the high-90s bar.
- [ ] Meta tags, Open Graph image, favicon.
- [ ] (Stretch) search/filter within a batch, per-profile deep links.

## Phase 5 — Admin CMS

- [ ] Build `/admin/` upload → SheetJS parse → column-mapping UI → Zod-validated preview
      (reusing `StudentCard`) → GitHub API publish (branch + PR).
- [ ] `src/lib/github-api.ts` wrapper (create branch, commit file, open PR).
- [ ] End-to-end test: actually upload the sample `Excel/PGDBA Batch 9...xlsx` file through the
      finished admin flow and confirm a real PR appears with correctly rendered cards.
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
