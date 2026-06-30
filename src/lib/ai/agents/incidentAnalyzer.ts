import { MODELS, runStructured } from "@/lib/ai/client";
import {
  INCIDENT_ANALYZER_SYSTEM,
  incidentAnalyzerUser,
} from "@/lib/ai/prompts/incidentAnalyzer";
import { IncidentAnalysisSchema, type IncidentAnalysis } from "@/lib/ai/schemas";

/** Agent 1 — fast structured extraction (Haiku, no thinking). */
export async function analyzeIncident(
  rawText: string,
  outputLanguage: string,
): Promise<IncidentAnalysis> {
  return runStructured({
    model: MODELS.fast,
    system: INCIDENT_ANALYZER_SYSTEM,
    user: incidentAnalyzerUser(rawText, outputLanguage),
    schema: IncidentAnalysisSchema,
    schemaName: "incident_analysis",
    maxTokens: 4000,
  });
}
