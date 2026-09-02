import { getCollection, type CollectionEntry } from "astro:content";

export type BatchEntry = CollectionEntry<"batches">;

/** All batches, oldest first (sorted by the batch's starting year). */
export async function getAllBatchesSorted(): Promise<BatchEntry[]> {
  const entries = await getCollection("batches");
  return entries.sort((a, b) => a.data.batch.localeCompare(b.data.batch));
}

export async function getLatestBatch(): Promise<BatchEntry> {
  const sorted = await getAllBatchesSorted();
  return sorted[sorted.length - 1];
}

export async function getSiteStats() {
  const batches = await getAllBatchesSorted();
  const totalRecords = batches.reduce((sum, b) => sum + b.data.records.length, 0);
  const firstYear = batches[0]?.data.batch.split("-")[0];
  const lastBatch = batches[batches.length - 1]?.data.batch;
  return {
    batchCount: batches.length,
    recordCount: totalRecords,
    firstYear,
    lastBatch,
  };
}
