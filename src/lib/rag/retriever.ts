import { embedQuery } from "@/lib/rag/embeddings";
import { hybridSearch } from "@/lib/rag/store";
import { logger } from "@/lib/logger";
import type { RetrievalResult } from "@/types";

const DEFAULT_K = 8;
// Cosine floor below which retrieval is too weak to ground a report. Calibrated
// for bge-small-en-v1.5 on this corpus: off-topic queries score ~0.46–0.51,
// relevant legal queries ~0.57–0.73, so 0.50 separates them. (The verifier's
// relevance gate is the real backstop for borderline-confident queries.)
const CONFIDENCE_THRESHOLD = 0.5;

/**
 * Agent 2 — Law Retriever. Turns a natural-language legal-issue query into
 * grounded statute chunks. Returns a confidence flag the pipeline uses to
 * decide between answering and the "not sufficiently confident" fallback.
 */
export async function retrieve(query: string, k = DEFAULT_K): Promise<RetrievalResult> {
  const vector = await embedQuery(query);
  const chunks = await hybridSearch(vector, query, k);

  const topScore = chunks.length > 0 ? chunks[0].score : 0;
  const confident = chunks.length > 0 && topScore >= CONFIDENCE_THRESHOLD;

  logger.debug("retrieval", {
    query: query.slice(0, 120),
    hits: chunks.length,
    topScore,
    confident,
  });

  return { chunks, topScore, confident };
}

/**
 * Retrieve for several legal-issue queries at once (Agent 1 emits multiple
 * issues), then merge + dedupe by chunk id keeping the best score.
 */
export async function retrieveMany(queries: string[], k = DEFAULT_K): Promise<RetrievalResult> {
  const results = await Promise.all(queries.map((q) => retrieve(q, k)));
  const byId = new Map<string, RetrievalResult["chunks"][number]>();
  for (const r of results) {
    for (const c of r.chunks) {
      const prev = byId.get(c.id);
      if (!prev || c.score > prev.score) byId.set(c.id, c);
    }
  }
  const chunks = [...byId.values()].sort((a, b) => b.score - a.score).slice(0, k * 2);
  const topScore = chunks.length > 0 ? chunks[0].score : 0;
  return { chunks, topScore, confident: chunks.length > 0 && topScore >= CONFIDENCE_THRESHOLD };
}
