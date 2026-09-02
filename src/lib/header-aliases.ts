/**
 * Maps the many differently-worded column/label headers seen across 11 years of source
 * files (and future Excel uploads) onto the single unified schema in schema.ts.
 *
 * Used by:
 * - scripts/migrate-html-batches.mjs (exact alias lookups against known historical headers)
 * - the admin CMS's column-mapping step (exact lookup first, then guessSchemaField() as a
 *   best-effort suggestion the admin must still confirm)
 *
 * Every entry's value is either a top-level InterviewRecord field name, or "questions.<x>"
 * for one of the nested question-category fields.
 */

/** Collapse whitespace/newlines, lowercase, and cut off explanatory/instructional suffixes
 *  (parenthetical notes, "- Enter in the following format...", trailing punctuation) so
 *  headers that only differ by their footnote text still match the same alias. */
export function normalizeHeader(raw: string): string {
  let s = raw.replace(/\s+/g, " ").trim().toLowerCase();
  s = s.replace(/^["']+|["']+$/g, "").trim();
  const idxParen = s.indexOf("(");
  const idxDash = s.indexOf(" - ");
  let cut = s.length;
  if (idxParen !== -1) cut = Math.min(cut, idxParen);
  if (idxDash !== -1) cut = Math.min(cut, idxDash);
  s = s.slice(0, cut).trim();
  s = s.replace(/[:.,?]+$/, "").trim();
  return s;
}

export const HEADER_ALIASES: Record<string, string> = {
  // identity
  name: "name",
  "student name": "name",
  "full name": "name",
  "pgdba course registration / roll number": "rollNumber",
  "roll number": "rollNumber",
  "linkedin profile": "linkUrl",
  linkedin: "linkUrl",
  "linkedin url": "linkUrl",
  "linkedin profile link": "linkUrl",

  // undergraduate
  "college name": "ugCollege",
  "undergraduate college / university": "ugCollege",
  "undergraduate college/university": "ugCollege",
  "undergrad college": "ugCollege",
  college: "ugCollege",
  "college/university": "ugCollege",
  "undergraduate background": "ugBackground",
  "undergrad background": "ugBackground",
  "year of graduation": "gradYear",
  "graduation year": "gradYear",
  "degree and specialization": "gradStream",
  "graduation stream": "gradStream",
  stream: "gradStream",
  specialization: "gradStream",

  // postgraduate
  "post graduation college / university": "pgCollege",
  "post graduation college/university": "pgCollege",
  "pg college": "pgCollege",
  "post graduation stream": "pgStream",
  "pg stream": "pgStream",
  "post graduation year": "pgYear",
  "pg year": "pgYear",
  "year of post graduation": "pgYear",

  // work experience
  "work experience": "workExMonths",
  "if yes, then total work experience in no. of months": "workExMonths",
  "work experience in months": "workExMonths",
  "work experience background": "workExBackground",
  "work ex domain": "workExBackground",
  "organizations worked with in chronological order": "organizations",
  organizations: "organizations",
  "name of the organization": "organizations",
  organization: "organizations",

  // scores
  "pgdba written test score": "writtenScore",
  "written test score": "writtenScore",
  "pgdba pre-interview score": "preInterviewScore",
  "pre-interview score": "preInterviewScore",
  "pre-interview composite score": "preInterviewScore",
  "pre interview score out of 60": "preInterviewScore",

  // prep
  "resources used for written examination": "resourcesWritten",
  "written exam resources": "resourcesWritten",
  "resources for exam preparation": "resourcesWritten",
  "useful resources for exam preparation": "resourcesWritten",
  "resources used for interview preparations": "resourcesInterview",
  "interview prep resources": "resourcesInterview",
  "tips for written exam": "resourcesWritten",
  "personal interview": "resourcesInterview",
  "personal interview tips": "resourcesInterview",
  "tips for personal interview": "resourcesInterview",
  "tips and resources for personal interview": "resourcesInterview",
  "prior coding experience": "priorCoding",
  "coding experience": "priorCoding",
  "any alternate programs": "alternatePrograms",
  "any alternate programs you were enrolled in while considering pgdba": "alternatePrograms",
  "did you receive any offers from alternate programs": "offers",
  "alternate offers": "offers",

  // question categories
  "general interview questions based on your work experience and profile": "questions.general",
  "work ex/profile questions": "questions.general",
  "general profile based questions asked": "questions.general",
  "general profile based questions that were asked": "questions.general",
  "general profile-based questions asked": "questions.general",
  "general interview questions: profile-based": "questions.general",
  "relevant technical/ analytics/ml questions": "questions.coding",
  "technical questions": "questions.coding",
  "what technical questions": "questions.coding",
  "interview questions: machine learning/ coding based": "questions.coding",
  "mathematics and statistics related interview questions": "questions.mathStats",
  "math/stats questions": "questions.mathStats",
  "maths/stats questions": "questions.mathStats",
  "maths/stats questions asked": "questions.mathStats",
  "what mathematics/statistics questions did the panel ask": "questions.mathStats",
  "interview questions: mathematics & statistics based": "questions.mathStats",
  "coding / ml related interview questions": "questions.coding",
  "coding/ml questions": "questions.coding",
  "gk and current affairs based questions": "questions.gk",
  "gk and current affairs questions": "questions.gk",
  "gk/current affairs asked": "questions.gk",
  "general knowledge or related questions": "questions.gk",
  "gk & current affairs interview questions": "questions.gk",
  "any other questions asked based on logical reasoning, puzzles": "questions.logical",
  "logical reasoning questions": "questions.logical",
  "puzzles/lr questions": "questions.logical",
  "any other kind of questions that you would like to share": "questions.logical",
  "any other kind of questions": "questions.logical",
  "miscellaneous interview questions": "questions.logical",
  "miscellaneous interview plan": "questions.logical",
  "questions asked in pgdba interview along with your answers": "questions.general",

  // ratings & tips
  "rate the interview difficulty on the scale of 1 to 5": "interviewDifficulty",
  "rate the written exam difficulty on the scale of 1 to 5": "writtenDifficulty",
  "interview difficulty": "interviewDifficulty",
  "written exam difficulty": "writtenDifficulty",
  "rating interview experience": "interviewDifficulty",
  "difficulty of the interview on a scale of 1 to 5": "interviewDifficulty",
  "tips for interview": "tips",
  "any tips for aspirants": "tips",
  "tips for aspirants": "tips",
  "any suggestion for aspirants regarding preparation for written test and interview": "tips",
  "tips for application form & interview": "tips",
};

/** Exact alias lookup. Returns undefined if this header has no known mapping. */
export function resolveSchemaField(rawHeader: string): string | undefined {
  return HEADER_ALIASES[normalizeHeader(rawHeader)];
}

/**
 * Best-effort fuzzy fallback for the admin CMS's column-mapping UI, used only when
 * resolveSchemaField() finds no exact alias (e.g. a genuinely new header wording).
 * Scores every known alias by token overlap and returns the best guess + score, so the UI
 * can show it as a pre-selected suggestion that the admin still must confirm.
 */
export function guessSchemaField(rawHeader: string): { field: string; score: number } | undefined {
  const target = new Set(normalizeHeader(rawHeader).split(" ").filter(Boolean));
  if (target.size === 0) return undefined;

  let best: { field: string; score: number } | undefined;
  for (const [alias, field] of Object.entries(HEADER_ALIASES)) {
    const words = new Set(alias.split(" ").filter(Boolean));
    const overlap = [...target].filter((w) => words.has(w)).length;
    const union = new Set([...target, ...words]).size;
    const score = union === 0 ? 0 : overlap / union;
    if (!best || score > best.score) best = { field, score };
  }
  return best && best.score > 0 ? best : undefined;
}
