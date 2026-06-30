import { MODELS, runStructured } from "@/lib/ai/client";
import { VERIFIER_SYSTEM, verifierUser } from "@/lib/ai/prompts/verifier";
import { VerificationSchema, type ApplicableLaw, type Verification } from "@/lib/ai/schemas";
import type { RetrievedChunk } from "@/types";

/** Agent 7 — adversarial grounding + relevance verification (fresh context). */
export async function verifyReport(
  laws: ApplicableLaw[],
  chunks: RetrievedChunk[],
  incidentSummary: string,
): Promise<Verification> {
  // Nothing to verify → trivially not-confident-but-clean.
  if (laws.length === 0) {
    return { verifiedLaws: [], overallConfident: false, notes: "No statutory citations to verify." };
  }
  return runStructured({
    model: MODELS.reasoning,
    system: VERIFIER_SYSTEM,
    user: verifierUser(laws, chunks, incidentSummary),
    schema: VerificationSchema,
    schemaName: "verification",
    maxTokens: 6000,
    effort: "high",
    thinking: true,
  });
}
