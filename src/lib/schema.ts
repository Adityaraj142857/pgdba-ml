import { z } from "zod";

/**
 * Shared schema for a single interview-experience record. Used by:
 * - the Astro content collection (build-time validation of src/data/batches/*.json)
 * - the migration script (scripts/migrate-html-batches.mjs)
 * - the admin CMS's in-browser preview/validation step
 */
export const questionsSchema = z.object({
  general: z.string().optional(),
  mathStats: z.string().optional(),
  coding: z.string().optional(),
  gk: z.string().optional(),
  logical: z.string().optional(),
});

export const interviewRecordSchema = z.object({
  id: z.string(),
  batch: z.string(),
  sourceFormat: z.enum(["narrative", "table-stacked", "table-kv", "card-grid"]),
  name: z.string().min(1),
  linkUrl: z.string().optional(),
  rollNumber: z.string().optional(),
  ugCollege: z.string().optional(),
  ugBackground: z.string().optional(),
  gradYear: z.string().optional(),
  gradStream: z.string().optional(),
  pgCollege: z.string().optional(),
  pgStream: z.string().optional(),
  pgYear: z.string().optional(),
  workExMonths: z.string().optional(),
  workExBackground: z.string().optional(),
  organizations: z.string().optional(),
  writtenScore: z.number().optional(),
  preInterviewScore: z.number().optional(),
  resourcesWritten: z.string().optional(),
  resourcesInterview: z.string().optional(),
  priorCoding: z.string().optional(),
  alternatePrograms: z.string().optional(),
  offers: z.string().optional(),
  questions: questionsSchema.default({}),
  interviewDifficulty: z.number().min(1).max(5).optional(),
  writtenDifficulty: z.number().min(1).max(5).optional(),
  tips: z.string().optional(),
  bio: z.string().optional(),
  story: z.string().optional(),
  part: z.string().optional(),
});

export const batchSchema = z.object({
  batch: z.string(),
  label: z.string(),
  publishedNote: z.string().optional(),
  records: z.array(interviewRecordSchema),
});

export type InterviewRecord = z.infer<typeof interviewRecordSchema>;
export type Batch = z.infer<typeof batchSchema>;
