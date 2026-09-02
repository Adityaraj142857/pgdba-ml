/**
 * One-time migration: parses the 11 archived WordPress HTML exports (4 different historical
 * formats — see .plan/02-data-model-and-migration.md) into src/data/batches/<batch>.json,
 * validated against the shared schema. Re-runnable any time the archive needs to be
 * re-processed (e.g. after fixing an adapter bug).
 *
 * Usage: npx tsx scripts/migrate-html-batches.ts
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { batchSchema, type InterviewRecord } from "../src/lib/schema.ts";
import { resolveSchemaField, normalizeHeader } from "../src/lib/header-aliases.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE_DIR = join(ROOT, "archive", "Interview_Experiences");
const OUT_DIR = join(ROOT, "src", "data", "batches");

type RawRecord = Partial<InterviewRecord> & { questions: InterviewRecord["questions"] };

const unmappedLog: string[] = [];
const warnings: string[] = [];

function newRawRecord(): RawRecord {
  return { questions: {} };
}

/** Some respondents typed their name in ALL CAPS (or all lowercase) on the Google Form.
 *  Title-cases those for a consistent look; leaves already-mixed-case names untouched so we
 *  don't mangle intentional capitals (initials, "PP", etc.). */
function tidyName(name: string): string {
  const letters = name.replace(/[^a-zA-Z]/g, "");
  const isShouting = letters.length > 1 && (letters === letters.toUpperCase() || letters === letters.toLowerCase());
  if (!isShouting) return name;
  return name
    .toLowerCase()
    .replace(/(^|[\s.'-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

/** Sets a value on a raw record by schema field path ("name" or "questions.mathStats"). */
function setField(rec: RawRecord, field: string, value: string) {
  let v = value.trim();
  if (!v) return;
  // Excel-derived years sometimes carry a float artifact ("2022.0") into the source HTML.
  if ((field === "gradYear" || field === "pgYear") && /^\d{4}\.0$/.test(v)) {
    v = v.slice(0, 4);
  }
  if (field.startsWith("questions.")) {
    const key = field.slice("questions.".length) as keyof InterviewRecord["questions"];
    (rec.questions as any)[key] = v;
    return;
  }
  if (field === "writtenScore" || field === "preInterviewScore" || field === "interviewDifficulty" || field === "writtenDifficulty") {
    const n = Number(v.replace(/[^\d.]/g, ""));
    if (Number.isNaN(n)) return;
    // A literal 0 on any of these scales means "left blank" in practice, not a real score/rating.
    if (n === 0) return;
    (rec as any)[field] = n;
    return;
  }
  (rec as any)[field] = v;
}

/** Extracts a cell's text, turning <li>/<br> boundaries into newlines so list items don't
 *  run together (the source HTML is minified with no whitespace between sibling <li>s). */
function extractText($: cheerio.CheerioAPI, el: any): string {
  const $clone = $(el).clone();
  $clone.find("br").replaceWith("\n");
  $clone.find("li").each((_, li) => {
    $(li).prepend("- ").append("\n");
  });
  return $clone
    .text()
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** Extracts the href of a cell's first link, if any (used for the linkUrl field, where the
 *  visible text is often just "LinkedIn" / "View Profile →" rather than the URL itself). */
function extractHref($: cheerio.CheerioAPI, el: any): string | undefined {
  return $(el).find("a").first().attr("href") || undefined;
}

/** Applies a raw {label, valueEl} pair to a record via the shared alias map, logging misses. */
function applyLabelValue(rec: RawRecord, batch: string, label: string, valueEl: any, $: cheerio.CheerioAPI) {
  const norm = normalizeHeader(label);
  if (!norm || norm === "questions") return; // header-row artifact in table-kv format
  const field = resolveSchemaField(label);
  if (!field) {
    unmappedLog.push(`[${batch}] unmapped header: "${label}"`);
    return;
  }
  const value = field === "linkUrl" ? extractHref($, valueEl) ?? extractText($, valueEl) : extractText($, valueEl);
  setField(rec, field, value);
}

// ---------------------------------------------------------------------------
// Format A: narrative (2015-17, 2016-18, 2017-19)
// ---------------------------------------------------------------------------
function parseNarrative(html: string, batch: string): InterviewRecord[] {
  const $ = cheerio.load(html);
  const records: InterviewRecord[] = [];
  let currentPart = "";
  let current: RawRecord | null = null;
  let index = 0;

  function finalize() {
    if (current && current.name) {
      index += 1;
      records.push({
        id: `${batch}-${String(index).padStart(2, "0")}`,
        batch,
        sourceFormat: "narrative",
        questions: {},
        ...current,
        name: tidyName(current.name),
        part: currentPart || undefined,
      } as InterviewRecord);
    }
    current = null;
  }

  $("body")
    .contents()
    .each((_, node) => {
      const el = node as any;
      if (el.type === "tag" && el.tagName === "h2" && $(el).hasClass("part-title")) {
        finalize();
        currentPart = $(el).text().trim();
        return;
      }
      if (el.type === "tag" && el.tagName === "hr") {
        finalize();
        return;
      }
      if (el.type === "tag" && el.tagName === "div" && $(el).hasClass("meta")) {
        return; // source metadata, not content
      }
      if (el.type === "tag" && el.tagName === "i") {
        finalize();
        current = newRawRecord();
        const anchor = $(el).find("a").first();
        const fullText = $(el).text().trim();
        const name = anchor.text().trim() || fullText.split(/[-,]/)[0].trim();
        current.name = name;
        current.linkUrl = anchor.attr("href") || undefined;
        let bio = fullText;
        if (name && bio.startsWith(name)) {
          bio = bio.slice(name.length).replace(/^[\s,–-]+/, "").trim();
        }
        current.bio = bio || undefined;
        return;
      }
      if (el.type === "tag" && el.tagName === "p") {
        const text = $(el).text().trim();
        if (/^\*+$/.test(text)) {
          finalize();
          return;
        }
        if (current && text) {
          current.story = current.story ? `${current.story}\n\n${text}` : text;
        }
        return;
      }
      if (el.type === "text") {
        const text = ($(el).text() || "").trim();
        if (current && text) {
          current.story = current.story ? `${current.story}\n\n${text}` : text;
        }
      }
    });
  finalize();
  return records;
}

// ---------------------------------------------------------------------------
// Format B: table-stacked (2018-20) — one <table> per student, label row then value row
// ---------------------------------------------------------------------------
function parseTableStacked(html: string, batch: string): InterviewRecord[] {
  const $ = cheerio.load(html);
  const records: InterviewRecord[] = [];
  let index = 0;

  $("table").each((_, tableEl) => {
    const rows = $(tableEl).find("tr");
    const rec = newRawRecord();
    let pendingLabel: string | null = null;
    rows.each((__, tr) => {
      const cell = $(tr).find("td").first();
      const cellText = cell.text().trim();
      const isLabel = $(tr).find("td strong").length > 0;
      if (isLabel) {
        pendingLabel = cellText;
      } else if (pendingLabel) {
        const normLabel = normalizeHeader(pendingLabel);
        // "Work Experience" here is a Yes/No gate, not a duration — the real duration comes
        // from the following "If Yes, then total Work Experience..." row, so skip the gate row
        // to avoid it clobbering workExMonths with the literal text "Yes"/"No".
        const isYesNoGate = normLabel === "work experience" && /^(yes|no)$/i.test(cellText);
        if (!isYesNoGate) applyLabelValue(rec, batch, pendingLabel, cell, $);
        pendingLabel = null;
      }
    });
    if (rec.name) {
      index += 1;
      records.push({
        id: `${batch}-${String(index).padStart(2, "0")}`,
        batch,
        sourceFormat: "table-stacked",
        ...rec,
        name: tidyName(rec.name),
      } as InterviewRecord);
    } else {
      warnings.push(`[${batch}] table-stacked: a table had no Name row (skipped)`);
    }
  });
  return records;
}

// ---------------------------------------------------------------------------
// Format C: table-kv (2019-21 .. 2024-26) — one <table> per student, 2 columns (label|value).
// Two sub-variants seen in the archive:
//  - 2023-25 / 2024-26: name is in a preceding <h2 class="wp-block-heading"> within the same
//    .wp-block-group wrapper.
//  - 2019-21 .. 2022-24: no heading/group at all; the table's own first row is
//    "Full name" | Student Name.
// ---------------------------------------------------------------------------
function parseTableKv(html: string, batch: string): InterviewRecord[] {
  const $ = cheerio.load(html);
  const records: InterviewRecord[] = [];
  let index = 0;

  $(".wp-block-table table").each((_, table) => {
    const rec = newRawRecord();
    $(table)
      .find("tr")
      .each((__, tr) => {
        const cells = $(tr).find("td");
        if (cells.length < 2) return;
        const label = $(cells[0]).text().trim();
        applyLabelValue(rec, batch, label, cells[1], $);
      });

    let name = rec.name;
    if (!name) {
      const group = $(table).closest(".wp-block-group");
      name = group.find("h2.wp-block-heading").first().text().trim() || undefined;
    }
    if (!name) {
      warnings.push(`[${batch}] table-kv: a table had no resolvable name (skipped)`);
      return;
    }

    index += 1;
    records.push({
      id: `${batch}-${String(index).padStart(2, "0")}`,
      batch,
      sourceFormat: "table-kv",
      ...rec,
      name: tidyName(name),
    } as InterviewRecord);
  });
  return records;
}

// ---------------------------------------------------------------------------
// Format D: card-grid (2025-27) — .student-card divs with .data-label/.data-value pairs
// ---------------------------------------------------------------------------
function parseCardGrid(html: string, batch: string): InterviewRecord[] {
  const $ = cheerio.load(html);
  const records: InterviewRecord[] = [];
  let index = 0;

  $("div.student-card").each((_, card) => {
    const name = $(card).find(".student-info h2").first().text().trim();
    if (!name) return;
    const rec = newRawRecord();
    rec.rollNumber = $(card).find(".app-id").first().text().trim() || undefined;

    $(card)
      .find(".header-badges .badge")
      .each((__, badge) => {
        const text = $(badge).text().trim();
        const scoreMatch = text.match(/score:\s*([\d.]+)/i);
        if (scoreMatch) {
          const n = Number(scoreMatch[1]);
          if (n !== 0) rec.writtenScore = n; // 0 means "left blank" in practice
        } else if (text) {
          rec.workExMonths = text;
        }
      });

    $(card)
      .find(".data-label")
      .each((__, labelEl) => {
        const label = $(labelEl).text().trim();
        const valueEl = $(labelEl).next(".data-value");
        if (label && valueEl.length) applyLabelValue(rec, batch, label, valueEl, $);
      });

    index += 1;
    records.push({
      id: `${batch}-${String(index).padStart(2, "0")}`,
      batch,
      sourceFormat: "card-grid",
      ...rec,
      name: tidyName(name),
    } as InterviewRecord);
  });
  return records;
}

// ---------------------------------------------------------------------------
// Format A-variant: numbered-list narrative (2017-19 only) — each student starts with
// "<b>N. Name </b>: Student Name" followed by <ol>/<ul> Q&A lists, no <i> bio markers and
// no tables at all. Rather than a fragile per-<li> parser (the <ol start="N"> numbering
// resets unpredictably and nesting is irregular), each student's whole block is kept as one
// flowing "story" — faithful to the source and renders fine via NarrativeArticle.
// ---------------------------------------------------------------------------
function parseNumberedList(html: string, batch: string): InterviewRecord[] {
  // Two variants seen in the source: "<b>N. Name </b><span>: </span><span>Student</span>"
  // (entries 1-4) and "<b>N. Name : </b><b>Student</b>" (entries 5-10, colon inside the tag).
  const chunks = html.split(/<b>\s*\d+\.\s*Name\s*:?\s*<\/b>/i);
  const records: InterviewRecord[] = [];

  for (let i = 1; i < chunks.length; i++) {
    const $ = cheerio.load(`<div id="root">${chunks[i]}</div>`);
    const fullText = $("#root").text().replace(/\r\n/g, "\n");
    const lines = fullText.split("\n").map((l) => l.trim());
    const firstLineIdx = lines.findIndex((l) => l.length > 0);
    if (firstLineIdx === -1) continue;
    const name = lines[firstLineIdx].replace(/^:\s*/, "").trim();
    if (!name) continue;

    let story = lines
      .slice(firstLineIdx + 1)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    records.push({
      id: `${batch}-${String(i).padStart(2, "0")}`,
      batch,
      sourceFormat: "narrative",
      questions: {},
      name: tidyName(name),
      story: story || undefined,
    } as InterviewRecord);
  }
  return records;
}

// ---------------------------------------------------------------------------
// Format detection + driver
// ---------------------------------------------------------------------------
function detectFormat(
  html: string
): "narrative" | "narrative-numbered" | "table-stacked" | "table-kv" | "card-grid" {
  if (html.includes("wp-block-table")) return "table-kv";
  if (html.includes("student-card")) return "card-grid";
  if (/<b>\s*\d+\.\s*Name\s*<\/b>/i.test(html)) return "narrative-numbered";
  if (/<table[\s>]/.test(html)) return "table-stacked";
  return "narrative";
}

function batchIdFromFilename(filename: string): string {
  const m = filename.match(/(\d{4}-\d{2})\.html$/);
  if (!m) throw new Error(`Cannot extract batch id from filename: ${filename}`);
  return m[1];
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const files = readdirSync(SOURCE_DIR).filter((f) => f.endsWith(".html")).sort();

  for (const file of files) {
    const batch = batchIdFromFilename(file);
    const html = readFileSync(join(SOURCE_DIR, file), "utf-8");
    const format = detectFormat(html);

    let records: InterviewRecord[];
    switch (format) {
      case "narrative":
        records = parseNarrative(html, batch);
        break;
      case "narrative-numbered":
        records = parseNumberedList(html, batch);
        break;
      case "table-stacked":
        records = parseTableStacked(html, batch);
        break;
      case "table-kv":
        records = parseTableKv(html, batch);
        break;
      case "card-grid":
        records = parseCardGrid(html, batch);
        break;
    }

    const batchDoc = {
      batch,
      label: `Batch ${batch}`,
      records,
    };

    const parsed = batchSchema.safeParse(batchDoc);
    if (!parsed.success) {
      console.error(`✗ ${batch}: schema validation failed`);
      console.error(parsed.error.format());
      process.exitCode = 1;
      continue;
    }

    writeFileSync(join(OUT_DIR, `${batch}.json`), JSON.stringify(parsed.data, null, 2) + "\n");
    console.log(`✓ ${batch} (${format}): ${records.length} records -> src/data/batches/${batch}.json`);
  }

  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  - ${w}`);
  }

  const reportPath = join(ROOT, "scripts", "migration-report.txt");
  const uniqueUnmapped = [...new Set(unmappedLog)].sort();
  writeFileSync(
    reportPath,
    `Migration report (${new Date().toISOString()})\n\n` +
      `${uniqueUnmapped.length} unique unmapped header(s) across all batches:\n` +
      uniqueUnmapped.map((l) => `  - ${l}`).join("\n") +
      "\n"
  );
  console.log(`\nUnmapped-header report written to scripts/migration-report.txt (${uniqueUnmapped.length} unique headers)`);
}

main();
