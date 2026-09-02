/**
 * Pure, framework-free helpers for turning a raw {field, value} pair into a properly-typed
 * value on an InterviewRecord. Shared by scripts/migrate-html-batches.ts (parsing the
 * archived HTML) and the admin CMS (parsing an uploaded Excel file) so both paths apply the
 * exact same coercion rules. No Node-only APIs here — this file is bundled for the browser.
 */
import type { InterviewRecord } from "./schema";

const NUMERIC_FIELDS = new Set(["writtenScore", "preInterviewScore", "interviewDifficulty", "writtenDifficulty"]);

/** Some respondents typed their name (or college/org) in ALL CAPS on the form. Title-cases
 *  those for a consistent look; leaves already-mixed-case text untouched so we don't mangle
 *  intentional capitals (initials, acronyms like "PP"). Only ever applied to `name`, since
 *  institution names frequently contain acronyms (IIT, NIT, BITS) that title-casing would
 *  incorrectly mangle (e.g. "IIT KHARAGPUR" -> "Iit Kharagpur"). */
export function tidyName(name: string): string {
  const letters = name.replace(/[^a-zA-Z]/g, "");
  const isShouting = letters.length > 1 && (letters === letters.toUpperCase() || letters === letters.toLowerCase());
  if (!isShouting) return name;
  return name.toLowerCase().replace(/(^|[\s.'-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

/** Coerces a raw string value for the given schema field ("name" or "questions.mathStats"),
 *  or returns undefined if the value should be dropped (blank, or a 0 that really means
 *  "left blank" on a 1-5 rating / score field). */
export function coerceFieldValue(field: string, rawValue: string): string | number | undefined {
  let v = rawValue.trim();
  if (!v) return undefined;

  if (field === "gradYear" || field === "pgYear") {
    // Excel-derived years sometimes carry a float artifact ("2022.0").
    if (/^\d{4}\.0$/.test(v)) v = v.slice(0, 4);
    return v;
  }

  if (NUMERIC_FIELDS.has(field)) {
    const n = Number(v.replace(/[^\d.]/g, ""));
    if (Number.isNaN(n)) return undefined;
    // A literal 0 on any of these scales means "left blank" in practice.
    if (n === 0) return undefined;
    return n;
  }

  if (field === "name") return tidyName(v);

  return v;
}

export type FieldMapping = Record<number, string | null>; // column index -> schema field path | null (ignored)

/** Builds one InterviewRecord from a spreadsheet-style row of cell values plus a column ->
 *  schema-field mapping. Used by the admin CMS after the admin confirms the column mapping. */
export function buildRecordFromRow(
  id: string,
  batch: string,
  sourceFormat: InterviewRecord["sourceFormat"],
  mapping: FieldMapping,
  row: unknown[]
): InterviewRecord {
  const rec: any = { id, batch, sourceFormat, questions: {} };
  for (const [colIndexStr, field] of Object.entries(mapping)) {
    if (!field) continue;
    const raw = row[Number(colIndexStr)];
    if (raw === undefined || raw === null) continue;
    const coerced = coerceFieldValue(field, String(raw));
    if (coerced === undefined) continue;
    if (field.startsWith("questions.")) {
      rec.questions[field.slice("questions.".length)] = coerced;
    } else {
      rec[field] = coerced;
    }
  }
  return rec as InterviewRecord;
}
