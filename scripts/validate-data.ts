/**
 * Fast standalone check that every src/data/batches/*.json file matches the shared schema.
 * Astro's content collection already enforces this at build time, but this is quicker to run
 * on its own (e.g. right after the Admin CMS or the migration script writes a new file).
 *
 * Usage: npx tsx scripts/validate-data.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { batchSchema } from "../src/lib/schema.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "src", "data", "batches");

let ok = true;
for (const file of readdirSync(DATA_DIR).filter((f) => f.endsWith(".json")).sort()) {
  const raw = JSON.parse(readFileSync(join(DATA_DIR, file), "utf-8"));
  const parsed = batchSchema.safeParse(raw);
  if (parsed.success) {
    console.log(`✓ ${file}: ${parsed.data.records.length} records`);
  } else {
    ok = false;
    console.error(`✗ ${file}: invalid`);
    console.error(parsed.error.format());
  }
}

if (!ok) process.exitCode = 1;
