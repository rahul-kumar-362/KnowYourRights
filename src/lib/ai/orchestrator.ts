import { analyzeIncident } from "@/lib/ai/agents/incidentAnalyzer";
import { adviseReport } from "@/lib/ai/agents/advisor";
import { verifyReport } from "@/lib/ai/agents/verifier";
import { DISCLAIMER, type AnalysisResult, type ApplicableLaw } from "@/lib/ai/schemas";
import { retrieveMany } from "@/lib/rag/retriever";
import { logger } from "@/lib/logger";

/** Normalize an (act, section) pair for matching verifier verdicts to report rows. */
function key(law: { act: string; section: string }): string {
  const sec = law.section.toLowerCase().replace(/section|sec|article|art|\.|\s/g, "");
  const act = law.act.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${act}|${sec}`;
}

/**
 * The full agent pipeline:
 *   Agent 1 (analyze) → Agent 2 (retrieve) → Agents 3-6 (advise) → Agent 7 (verify)
 * Only verifier-confirmed statutes survive into the final report.
 */
export async function runAnalysis(
  rawText: string,
  outputLanguage: string,
): Promise<AnalysisResult> {
  // 1. Extract structured incident.
  const analysis = await analyzeIncident(rawText, outputLanguage);

  // 2. Retrieve grounding sources for each legal issue.
  const queries =
    analysis.retrievalQueries.length > 0 ? analysis.retrievalQueries : [rawText];
  const retrieval = await retrieveMany(queries);

  // 3. Generate the grounded report.
  const report = await adviseReport(analysis, retrieval.chunks, outputLanguage);

  // 4. Verify every cited statute: grounded in sources AND relevant to the facts.
  const verification = await verifyReport(
    report.applicableLaws,
    retrieval.chunks,
    report.incidentSummary,
  );

  // 5. Enforce grounding + relevance: keep only statutes that are both
  //    verifier-confirmed (exist in sources) and relevant to the incident.
  const confirmed = new Set(
    verification.verifiedLaws
      .filter((v) => v.verdict === "confirmed" && v.relevant)
      .map((v) => key(v)),
  );
  const filteredLaws: ApplicableLaw[] = report.applicableLaws.filter((l) =>
    confirmed.has(key(l)),
  );
  const dropped = report.applicableLaws.length - filteredLaws.length;
  if (dropped > 0) logger.warn("verifier dropped unsupported citations", { dropped });

  report.applicableLaws = filteredLaws;

  const confident = retrieval.confident && verification.overallConfident;

  return {
    analysis,
    report,
    verification,
    confident,
    retrievalTopScore: retrieval.topScore,
    disclaimer: DISCLAIMER,
  };
}
