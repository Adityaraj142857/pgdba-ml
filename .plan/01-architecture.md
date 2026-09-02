# Architecture

## Stack

- **Astro** (static output mode, `output: 'static'`) — the whole site is pre-rendered to plain
  HTML/CSS/JS at build time. No server runtime, no database, so it deploys to GitHub Pages for
  free and stays that way regardless of traffic.
- **Vanilla/minimal client JS** for interactivity that genuinely needs the browser: the batch
  year-switcher, card search/filter on the Experiences page, and the entire Admin CMS flow.
  No React/Vue — Astro's islands mean we only ship JS where it's needed, keeping the public
  pages fast and simple.
- **SheetJS (xlsx)** loaded client-side only on `/admin/`, for parsing the uploaded Excel file
  in-browser.
- **GitHub REST API** (`Contents` + `Pull Requests` endpoints), called client-side only on
  `/admin/`, using a PAT the admin supplies. This is the entire "backend."

## Why Astro over the alternatives considered

- Plain HTML/CSS/JS would mean hand-duplicating the student-card markup across 11 batches and
  ~500+ individual profiles — error-prone and painful to restyle later.
- A React SPA adds routing/hydration complexity and a heavier JS payload for a content site
  that's 95% static reading, not interaction.
- Astro's **content collections** (Zod-schema-validated JSON/Markdown) are a natural fit: the
  migrated batch data becomes typed, validated content, and pages are generated from it with
  `getStaticPaths`.

## How "admin publishing with no backend" actually works

This is the crux of the whole system, so it's worth stating plainly:

1. The **data the site renders lives in the git repo** as JSON files
   (`src/data/batches/2024-26.json`, etc.).
2. The **Admin page is just another static page** in the same Astro build — it ships JS that
   runs entirely in the visitor's browser.
3. When the admin uploads an Excel file, that JS parses it, builds a new/updated JSON batch
   file in memory, and then calls the **GitHub REST API directly from the browser** (using
   `fetch`, authenticated with the PAT the admin pasted in) to write that JSON file into the
   repo — either as a direct commit to `main` or (recommended default, see
   [`04-admin-cms.md`](./04-admin-cms.md)) as a new branch + pull request.
4. A **GitHub Actions workflow** is already configured to rebuild and redeploy the site on any
   push/merge to `main`. So the moment the PR is merged (or the direct commit lands), GitHub
   Pages rebuilds automatically — no human runs a build command, no server is ever provisioned.

This pattern is the same idea behind git-based headless CMS tools (Netlify/Decap CMS,
Tina, etc.), just built directly rather than pulling in a third-party CMS dependency — because
none of the popular ones have a zero-backend, GitHub-Pages-only mode that doesn't need an
OAuth proxy server.

## Repo layout (target)

```
/
├── .github/workflows/deploy.yml       # build + deploy to GitHub Pages on push to main
├── .plan/                             # this planning folder
├── archive/                           # original HTML/Excel sources, kept for provenance
│   ├── Interview_Experiences/*.html   #   (moved here, not shipped in the build)
│   └── Excel/*.xlsx
├── public/
│   └── images/                        # logo, banner (moved from /images)
├── scripts/
│   ├── migrate-html-batches.mjs       # one-time: parse archive/*.html -> src/data/batches/*.json
│   └── validate-data.mjs              # re-validate all batch JSON against the schema
├── src/
│   ├── components/
│   │   ├── Navbar.astro
│   │   ├── Footer.astro
│   │   ├── StudentCard.astro
│   │   ├── NarrativeArticle.astro     # renders old free-text batches (2015-17 etc.)
│   │   ├── BatchSwitcher.astro
│   │   └── StatStrip.astro
│   ├── content/
│   │   └── config.ts                  # Zod schema for the batches collection
│   ├── data/
│   │   └── batches/
│   │       ├── 2015-17.json
│   │       ├── ...
│   │       └── 2025-27.json
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── lib/
│   │   ├── schema.ts                  # shared Zod schema (used by build + admin CMS JS)
│   │   ├── header-aliases.ts          # column-name -> schema-field fuzzy alias map
│   │   └── github-api.ts              # thin wrapper around the GitHub Contents/PR API
│   └── pages/
│       ├── index.astro                # About (homepage)
│       ├── experiences/
│       │   ├── index.astro            # defaults to most recent batch
│       │   └── [batch].astro          # one static page per batch, via getStaticPaths
│       └── admin/
│           └── index.astro            # upload -> map -> preview -> publish
├── astro.config.mjs
└── package.json
```

## Data flow summary

```
archive/*.html, archive/*.xlsx           (one-time, historical)
        │  migrate-html-batches.mjs
        ▼
src/data/batches/*.json  ──────────────┐
        │  (Astro content collection)  │
        ▼                              │
static pages at build time             │  admin uploads a NEW batch's Excel
(About, Experiences, per-batch)        │  at /admin/ → parsed in-browser →
        ▲                              │  written back here via GitHub API
        └──────────────────────────────┘
                 GitHub Actions rebuilds + redeploys on every merge to main
```
