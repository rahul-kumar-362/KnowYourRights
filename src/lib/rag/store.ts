import { env } from "@/lib/config/env";
import * as qdrant from "@/lib/rag/qdrant";
import * as local from "@/lib/rag/localStore";
import type { LawChunk, RetrievedChunk } from "@/types";

/**
 * Vector-store dispatcher. VECTOR_STORE=local (default) uses a zero-infra file
 * store; VECTOR_STORE=qdrant uses Qdrant (production). Both backends expose the
 * same interface, so retriever.ts and ingest.ts are backend-agnostic.
 */
const useLocal = () => env().VECTOR_STORE === "local";

export function ensureStore(): Promise<void> {
  return useLocal() ? local.ensureLocalStore() : qdrant.ensureCollection();
}

export function upsertChunks(chunks: LawChunk[], vectors: number[][]): Promise<void> {
  return useLocal() ? local.upsertLocal(chunks, vectors) : qdrant.upsertChunks(chunks, vectors);
}

export function hybridSearch(
  queryVector: number[],
  rawQuery: string,
  k: number,
): Promise<RetrievedChunk[]> {
  return useLocal()
    ? local.searchLocal(queryVector, rawQuery, k)
    : qdrant.hybridSearch(queryVector, rawQuery, k);
}
