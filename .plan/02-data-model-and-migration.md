# Data Model & Migration

## Unified schema

Every interview record on the new site — regardless of which batch or source format it came
from — is normalized into one shape. Fields marked *(narrative only)* / *(structured only)*
are format-specific; everything else is common.

```ts
type InterviewRecord = {
  id: string;                 // slug: "<batch>-<index>", e.g. "2024-26-07"
  batch: string;               // "2024-26"
  sourceFormat: "narrative" | "table-stacked" | "table-kv" | "card-grid";
  name: string;
  linkUrl?: string;             // LinkedIn/Facebook profile if present
  rollNumber?: string;
  ugCollege?: string;
  ugBackground?: string;
  gradYear?: string;
  gradStream?: string;
  pgCollege?: string;
  pgStream?: string;
  pgYear?: string;
  workExMonths?: string;
  workExBackground?: string;
  organizations?: string;
  writtenScore?: number;
  preInterviewScore?: number;
  resourcesWritten?: string;
  resourcesInterview?: string;
  priorCoding?: string;
  alternatePrograms?: string;
  offers?: string;
  questions: {
    general?: string;          // work-ex / profile questions
    mathStats?: string;
    coding?: string;
    gk?: string;
    logical?: string;
  };
  interviewDifficulty?: number; // 1-5
  writtenDifficulty?: number;   // 1-5
  tips?: string;
  bio?: string;                 // (narrative only) one-line intro, e.g. "B.Tech in EEE, 2.5 yrs..."
  story?: string;                // (narrative only) the full free-text paragraph
  part?: string;                 // (narrative only) "Part 1" / "Part 2" grouping within a batch
};
```

Rendering rule: `sourceFormat === "narrative"` records render via `NarrativeArticle.astro`
(magazine-style flowing text). Everything else renders via `StudentCard.astro` (structured
Q&A card), since `table-stacked`, `table-kv`, and `card-grid` all normalize to the same fields.

Batch-level wrapper:

```ts
type Batch = {
  batch: string;          // "2024-26"
  label: string;          // "Batch 2024-26"
  publishedNote?: string; // optional intro/preamble text carried over from the original post
  records: InterviewRecord[];
};
```

## Source format audit (evidence gathered directly from the files)

| File | Format | Evidence |
|---|---|---|
| `2015-17.html`, `2016-18.html`, `2017-19.html` | **narrative** | Free-text: `<i>Name — bio</i>` followed by a `<p>` quote block, entries separated by `<p style="text-align:center">******</p>`, parts separated by `<hr class="part-divider">` + `<h2 class="part-title">Part N</h2>`. |
| `2018-20.html` | **table-stacked** | 47 `<table width="624">` elements, each a *single-column* table where a `<tr><td><strong>Label</strong></td></tr>` row is immediately followed by a `<tr><td>Value</td></tr>` row (label and value are separate table rows, not side-by-side cells). |
| `2019-21.html` … `2024-26.html` | **table-kv** | WordPress block tables: `<figure class="wp-block-table ..."><table>...<tr><td><strong>Label</strong></td><td>Value</td></tr>...</table></figure>`, one table per student, student name in a preceding `<h2 class="wp-block-heading">`. Counts confirmed: 41/50/45/58/62/59 tables across these 6 files. |
| `2025-27.html` | **card-grid** | Modern hand-built HTML: `<div class="student-card">` containing `<h2>Name</h2>`, a badges row (score, work months), and `<div class="data-item">`/`<div class="highlight-section">` blocks each with a `.data-label` + `.data-value` div pair. Cleanest source format of the eleven — was clearly already generated from the same kind of Excel this project's Admin tool will produce.

So: **4 parser adapters needed**, not 11. Each adapter's only job is to walk its DOM shape and
emit `{ label, value }` pairs (or narrative text) per student; a shared **header-alias map**
then normalizes labels like `"College Name"` (2018-20) / `"Undergraduate College / University"`
(2019+) / `"Undergrad College"` (2025-27) all onto the single schema field `ugCollege`. This
alias map is also reused by the live Admin CMS (see [`04-admin-cms.md`](./04-admin-cms.md)),
since new Excel exports will have the same year-to-year header drift.

## Migration script plan (`scripts/migrate-html-batches.mjs`)

- One-time, run locally with Node.js (not part of the live site). Uses `cheerio` to parse each
  archived HTML file.
- Steps per file:
  1. Detect format (narrative vs. one of the 3 table/card shapes) from structural markers
     (`.part-title` presence, `<table>` vs `.student-card` presence, etc. — same markers used
     in the audit above).
  2. Run the matching adapter to extract raw `{label, value}` pairs or narrative blocks per
     student.
  3. Run each pair through `header-aliases.ts` to map onto schema fields; anything unmapped is
     logged to a `migration-report.txt` (not silently dropped) so nothing gets lost.
  4. Coerce numeric fields (`writtenScore`, `preInterviewScore`, difficulty ratings) with
     `Number()`, leaving `undefined` if not parseable.
  5. Assign a stable `id` per record and write `src/data/batches/<batch>.json`.
- After the script runs, **manually spot-check** at least 3 records per batch (33+ total)
  against the rendered card/article to catch adapter bugs — especially the 2024-26 file, which
  has irregular nested `<strong><strong>...</strong></strong>` markup around some headers (seen
  directly in the source) that a naive `.text()` extraction could mangle.
- Original files move to `archive/` (not deleted) so the migration is always re-runnable and
  the raw source is preserved as ground truth.

## Validation

- `src/lib/schema.ts` defines the schema once with **Zod**.
- Astro's content collections use this schema directly (`src/content/config.ts`), so `astro
  build` **fails loudly** if any batch JSON is malformed — no bad data silently ships.
- `scripts/validate-data.mjs` runs the same schema against all files for a fast pre-commit /
  pre-PR check, and is reused by the Admin CMS preview step (client-side, same schema compiled
  for the browser) so an admin gets the same validation before publishing a new batch.

## Excel (Admin upload) mapping

The `Excel/PGDBA Batch 9 Interview Experience (Responses).xlsx` sample is a raw Google Forms
export: 1 header row, 1 row per respondent, 27 columns. Its columns map onto the schema via the
same alias table, e.g. (abridged):

| Excel column (Batch 9 sample) | Schema field |
|---|---|
| `Name` | `name` |
| `PGDBA Course Registration / Roll Number` | `rollNumber` |
| `Undergraduate College / University` | `ugCollege` |
| `Work Experience (in months as of 25 January 2023)` | `workExMonths` |
| `PGDBA Written Test Score` | `writtenScore` |
| `Mathematics and Statistics related interview questions...` | `questions.mathStats` |
| `Rate the interview difficulty on the scale of 1 to 5` | `interviewDifficulty` |
| `Any tips for aspirants (write in points, if any)` | `tips` |

The Admin CMS does **not** hardcode this mapping blindly — because the audit above already
shows headers drift by year (`"Rate the Interview difficulty..."` vs `"Rate the interview
difficulty..."`, `"Post Graduation Stream"` appearing/disappearing, etc.). Instead it does a
fuzzy best-guess match against the alias table and always shows the admin a **confirm/adjust**
step before parsing further. Full detail in [`04-admin-cms.md`](./04-admin-cms.md).
