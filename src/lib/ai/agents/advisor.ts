import { MODELS, runStructured } from "@/lib/ai/client";
import { ADVISOR_SYSTEM, advisorUser } from "@/lib/ai/prompts/advisor";
import { ReportSchema, type IncidentAnalysis, type Report } from "@/lib/ai/schemas";
import type { RetrievedChunk } from "@/types";

/** Agents 3-6 fused — grounded report generation (Opus, adaptive thinking). */
export async function adviseReport(
  analysis: IncidentAnalysis,
  chunks: RetrievedChunk[],
  outputLanguage: string,
): Promise<Report> {
  return runStructured({
    model: MODELS.reasoning,
    system: ADVISOR_SYSTEM,
    user: advisorUser(analysis, chunks, outputLanguage),
    schema: ReportSchema,
    schemaName: "legal_report",
    maxTokens: 16000,
    effort: "high",
    thinking: true,
  });
}
