import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { batchSchema } from "./lib/schema";

const batches = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/data/batches" }),
  schema: batchSchema,
});

export const collections = { batches };
