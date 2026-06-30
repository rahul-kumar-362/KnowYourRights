// zod/v4 — required by the Anthropic SDK's zodOutputFormat helper.
import { z } from "zod/v4";

/** Agent 1 — Incident Analyzer output. */
export const IncidentAnalysisSchema = z.object({
  summary: z.string().describe("Plain-language summary of the user's situation"),
  language: z.string().describe("Detected input language (ISO code or name)"),
  entities: z.array(z.string()),
  people: z.array(z.object({ role: z.string(), description: z.string() })),
  timeline: z.array(z.string()),
  evidenceMentioned: z.array(z.string()),
  crimeTypes: z.array(z.string()),
  legalIssues: z.array(z.string()),
  rightsViolated: z.array(z.string()),
  retrievalQueries: z
    .array(z.string())
    .describe("3-6 focused queries to retrieve the relevant statutes for these legal issues"),
});
export type IncidentAnalysis = z.infer<typeof IncidentAnalysisSchema>;

const Provenance = z.enum(["Retrieved source", "General guidance", "Model inference"]);

export const ApplicableLawSchema = z.object({
  act: z.string(),
  section: z.string(),
  reason: z.string(),
  maxPunishment: z.string(),
  bailable: z.string(),
  cognizable: z.string(),
  compoundable: z.string(),
  provenance: Provenance,
  // "direct" = the stated facts satisfy this offence's essential ingredients.
  // "conditional" = applies only under extra circumstances not clearly stated.
  applicability: z.enum(["direct", "conditional"]),
});
export type ApplicableLaw = z.infer<typeof ApplicableLawSchema>;

/** Agent 3-6 — the 14-section legal guidance report (pre-verification). */
export const ReportSchema = z.object({
  incidentSummary: z.string(),
  legalIssues: z.array(z.string()),
  applicableLaws: z.array(ApplicableLawSchema),
  constitutionalRights: z.array(z.object({ article: z.string(), description: z.string() })),
  citizenRights: z.array(z.string()),
  whatToDoNow: z.array(z.string()),
  documentsRequired: z.array(z.string()),
  evidenceRequired: z.array(z.string()),
  authoritiesToContact: z.array(
    z.object({ name: z.string(), contact: z.string(), why: z.string() }),
  ),
  emergencyContacts: z.array(z.object({ name: z.string(), number: z.string() })),
  legalTimeline: z.array(z.string()),
  possibleOutcomes: z.object({
    bestCase: z.string(),
    averageCase: z.string(),
    worstCase: z.string(),
  }),
  importantWarnings: z.array(z.string()),
});
export type Report = z.infer<typeof ReportSchema>;

/** Agent 7 — Verifier output. */
export const VerificationSchema = z.object({
  verifiedLaws: z.array(
    z.object({
      act: z.string(),
      section: z.string(),
      // grounding: does the section exist in the retrieved sources?
      verdict: z.enum(["confirmed", "unsupported", "mismatch"]),
      // relevance: do the incident's stated facts satisfy this section's elements?
      relevant: z.boolean(),
      note: z.string(),
    }),
  ),
  overallConfident: z.boolean(),
  notes: z.string(),
});
export type Verification = z.infer<typeof VerificationSchema>;

export const DISCLAIMER =
  "This information is for educational purposes and is not a substitute for advice from a qualified legal professional.";

/** Final payload returned to the client. */
export interface AnalysisResult {
  analysis: IncidentAnalysis;
  report: Report;
  verification: Verification;
  confident: boolean;
  retrievalTopScore: number;
  disclaimer: string;
}
