import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "@/lib/config/env";
import { EMBED_DIM } from "@/lib/rag/embeddings";
import type { LawChunk, LawChunkPayload, RetrievedChunk } from "@/types";

let client: QdrantClient | null = null;

function qdrant(): QdrantClient {
  if (client) return client;
  client = new QdrantClient({ url: env().QDRANT_URL, apiKey: env().QDRANT_API_KEY });
  return client;
}

const collection = () => env().QDRANT_COLLECTION;

/** Create the collection + payload indexes if missing. Idempotent. */
export async function ensureCollection(): Promise<void> {
  const name = collection();
  const existing = await qdrant().getCollections();
  if (existing.collections.some((c) => c.name === name)) return;

  await qdrant().createCollection(name, {
    vectors: { size: EMBED_DIM, distance: "Cosine" },
  });

  // Full-text index on the statute text + keyword indexes for exact-token lookups.
  await qdrant().createPayloadIndex(name, { field_name: "text", field_schema: "text" });
  await qdrant().createPayloadIndex(name, {
    field_name: "sectionNumber",
    field_schema: "keyword",
  });
  await qdrant().createPayloadIndex(name, {
    field_name: "actShortCode",
    field_schema: "keyword",
  });
}

export async function upsertChunks(chunks: LawChunk[], vectors: number[][]): Promise<void> {
  await qdrant().upsert(collection(), {
    wait: true,
    points: chunks.map((c, i) => ({
      id: c.id,
      vector: vectors[i],
      payload: c.payload as unknown as Record<string, unknown>,
    })),
  });
}

function toRetrieved(
  hit: { id: string | number; score?: number; payload?: Record<string, unknown> | null },
  matchType: "dense" | "keyword",
): RetrievedChunk {
  const p = (hit.payload ?? {}) as unknown as LawChunkPayload;
  return { ...p, id: String(hit.id), score: hit.score ?? 0, matchType };
}

/**
 * Hybrid retrieval = dense vector search + exact keyword lookups for any
 * section-number / act-code tokens parsed from the query. Pure dense search
 * misses exact legal tokens like "Section 318" or "BNS 63"; the keyword leg
 * catches them. (BM25 sparse vectors are a later upgrade behind this same API.)
 */
export async function hybridSearch(
  queryVector: number[],
  rawQuery: string,
  k: number,
): Promise<RetrievedChunk[]> {
  const name = collection();

  const dense = await qdrant().search(name, {
    vector: queryVector,
    limit: k,
    with_payload: true,
  });

  const keywordHits = await keywordLookup(name, rawQuery, k);

  // Merge, dedupe by id, keep best score per chunk.
  const merged = new Map<string, RetrievedChunk>();
  for (const h of dense.map((d) => toRetrieved(d, "dense"))) merged.set(h.id, h);
  for (const h of keywordHits) {
    const prev = merged.get(h.id);
    if (!prev || h.score > prev.score) merged.set(h.id, h);
  }

  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, k);
}

/** Parse section-number tokens and exact-match them in the payload. */
async function keywordLookup(
  name: string,
  rawQuery: string,
  k: number,
): Promise<RetrievedChunk[]> {
  const numbers = Array.from(rawQuery.matchAll(/\b(?:section|sec|article|art)\.?\s*([0-9]+[A-Za-z]?)\b/gi)).map(
    (m) => m[1],
  );
  if (numbers.length === 0) return [];

  const scrolled = await qdrant().scroll(name, {
    limit: k,
    with_payload: true,
    filter: { should: numbers.map((n) => ({ key: "sectionNumber", match: { value: n } })) },
  });

  // Exact section-number matches get a strong fixed score so they survive the merge.
  return scrolled.points.map((p) => toRetrieved({ ...p, score: 0.95 }, "keyword"));
}
