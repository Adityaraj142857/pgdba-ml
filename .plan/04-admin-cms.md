# Admin CMS (`/admin/`)

This is the feature that replaces "a person with database access" with "a static page that
talks to GitHub directly." It has to be trustworthy (won't silently corrupt data) and legible
(a non-developer committee member can use it a year from now without re-reading this doc).

## End-to-end flow

1. **Unlock**: admin pastes a GitHub Personal Access Token into a field on `/admin/`. Stored in
   `localStorage` only (never sent anywhere except `api.github.com`). A "Log out" button clears
   it. The token itself *is* the access control — anyone without a valid PAT scoped to this
   repo simply cannot publish, so there's no separate password system to maintain.
2. **Choose batch**: dropdown of existing batches (to *replace/append* to one) or a "new batch"
   text input (e.g. `2026-28`) validated against a `YYYY-YY` pattern.
3. **Upload Excel**: `.xlsx` file dropped/selected, parsed **entirely client-side** with
   SheetJS — nothing is uploaded to any server at this point, it's read straight into the
   browser's memory.
4. **Column mapping**: the tool reads the header row, fuzzy-matches each header against the
   shared `header-aliases.ts` table (the same one the migration script uses), and shows a table:
   *Excel column → guessed schema field*, with a dropdown per row to correct any wrong guess and
   an explicit "ignore this column" option. This step exists because the audit of past files
   already proved headers drift year to year — the tool must never silently assume a fixed
   layout.
5. **Parse + validate**: each row becomes an `InterviewRecord`, run through the same Zod schema
   used at build time. Rows that fail validation (e.g. name missing) are flagged inline in red
   with the specific reason and **excluded from publish** until fixed in the source Excel and
   re-uploaded, or explicitly skipped by the admin.
6. **Preview**: valid rows render using the *actual* `StudentCard` component (imported into the
   admin page too) — so the admin is looking at exactly what will appear on the live site, not
   a raw data dump. If updating an existing batch, show a diff summary: N new profiles, N
   changed, N unchanged, N removed (present in the old file but not the new upload — flagged,
   never silently deleted).
7. **Publish**: on confirm, the page calls the GitHub REST API to:
   - Create a new branch off `main` (e.g. `cms/2026-28-upload-<timestamp>`),
   - Commit the updated `src/data/batches/<batch>.json` to that branch (Contents API, base64
     content),
   - Open a **pull request** into `main` with an auto-generated description (batch, row counts,
     "Published via /admin/").
8. GitHub Actions already rebuilds/redeploys on merge to `main` (see
   [`05-deployment-and-ops.md`](./05-deployment-and-ops.md)) — merging the PR (one click on
   GitHub, or asking the site owner to review) is the only remaining manual step, and it's the
   deliberate safety net, not friction for its own sake.

**Default is PR-based, not direct-to-main**, so a bad upload can't take the live site down
silently — it just sits as an open PR until reviewed. This is called out as an open question in
the README in case the user prefers a "trust it, push straight to main" mode instead (easy
follow-up change if so — it's a one-line difference in which API call the publish step makes).

## Security notes (be explicit with the user about these)

- Recommend a **fine-grained PAT** scoped to *only this one repository*, with **Contents:
  Read and write** and **Pull requests: Read and write** permissions and nothing else, and a
  short expiry (e.g. 90 days) — GitHub's fine-grained token UI supports all of this directly.
- The token lives in the browser's `localStorage`, which is readable by any JS running on the
  page's origin — acceptable here because this is a single-purpose static page with no
  third-party scripts, but worth the admin knowing: don't paste the token on a shared/public
  computer and forget to log out.
- Never commit a PAT to the repo, never log it, never send it anywhere but
  `api.github.com`.

## Edge cases the flow must handle

- **Re-uploading the same batch** (corrections after initial publish): treated as an update,
  diffed against the existing JSON as described in step 6.
- **Duplicate names within one upload**: flagged, not auto-merged (people share names; let the
  admin decide).
- **Partially filled rows** (a respondent skipped optional Excel questions): fine — most schema
  fields are optional; only `name` and `batch` are required.
- **Wrong file type / corrupted Excel**: caught by SheetJS parse failure, shown as a clear error
  before any GitHub call is attempted.
- **Expired/invalid PAT**: the first failing GitHub API call surfaces GitHub's actual error
  message rather than a generic failure, so the admin knows to regenerate the token.

## Why not the other two options considered

- *Manual download + `git push`*: rejected by the user — would mean re-teaching a git workflow
  to whoever runs the committee each year.
- *Raw `.xlsx` upload + a GitHub Action to parse it*: rejected by the user — moves the mapping
  logic out of sight (a broken parse would only be discovered after a commit already landed,
  and debugging a GitHub Actions log is a worse experience for a non-developer than an in-page
  preview with inline error messages).
