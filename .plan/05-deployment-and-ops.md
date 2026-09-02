# Deployment & Operations

## GitHub repo setup (needed before Phase 0 can finish)

- **Must be a public repository** — GitHub Pages is free for public repos; private-repo Pages
  requires a paid GitHub plan, which conflicts with the user's $0 requirement. Confirm this is
  acceptable (all the content being published — interview experiences, PGDBA info — is already
  intended to be public-facing, so this should be a non-issue, but worth a conscious yes).
- **Repo name**: TBD from the user. Determines the Astro `base` config:
  - If served at `https://<username>.github.io/<repo-name>/` (typical project page), Astro
    needs `base: '/<repo-name>'` set in `astro.config.mjs`.
  - If the repo is named `<username>.github.io` exactly, it serves at the root
    (`https://<username>.github.io/`) with no `base` needed — simpler, and worth considering if
    this is meant to be the user's primary personal/organization Pages site.

## Build & deploy pipeline

`.github/workflows/deploy.yml`:

- Trigger: `push` to `main` (covers both the Admin CMS's merged PRs and normal development
  commits), plus `workflow_dispatch` for manual re-runs.
- Steps: checkout → setup Node → `npm ci` → `npm run build` (Astro) → upload build output as a
  Pages artifact → deploy via `actions/deploy-pages`.
- This is the official, currently-recommended GitHub Pages deploy method for Astro (no
  third-party gh-pages-branch action needed) — zero cost, runs on GitHub's free Actions minutes
  for public repos.

## Branch protection

- `main` protected: no direct pushes (or at least, direct pushes discouraged/disallowed for the
  Admin CMS's write path — see the PR-based default in
  [`04-admin-cms.md`](./04-admin-cms.md)).
- Require the Admin CMS's PRs to be merged manually (one click) — this is the intended human
  checkpoint, not an oversight.

## Backups / provenance

- `archive/Interview_Experiences/*.html` and `archive/Excel/*.xlsx` (the original sources)
  stay committed to the repo under `archive/`, excluded from the Astro build input, purely as a
  historical record — if the JSON migration ever needs to be redone or audited, the raw source
  is still there.
- Git history itself is the audit log for every Admin CMS publish (each is a real commit/PR
  with a timestamp and diff).

## Custom domain (optional, out of scope for MVP)

- The old site used `aspirants.pgdba.ml`. If still owned, it can be pointed at the new GitHub
  Pages site via a `CNAME` file + DNS record pointing at `<username>.github.io` — no additional
  cost since the domain registration is a pre-existing/separate expense, not something this
  project introduces. Revisit in Phase 7 once the core site is live and stable.

## Ongoing cost check

Everything in this plan — GitHub Pages hosting, GitHub Actions build minutes (public repo =
free/unlimited standard runners), the GitHub REST API calls from `/admin/` — is free under
GitHub's standard terms for public repositories. The only thing that could ever introduce a
cost is a custom domain *if* one isn't already owned, and that's explicitly deferred/optional.
