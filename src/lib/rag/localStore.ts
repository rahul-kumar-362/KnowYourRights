import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { LawChunk, LawChunkPayload, RetrievedChunk } from "@/types";

/**
 * Zero-infrastructure vector store: embeddings persisted to a JSON file,
 * brute-force cosine search in memory. Fine for the MVP corpus (~1.5k chunks).
 * Production swaps to Qdrant via VECTOR_STORE=qdrant (see store.ts).
 */
const FILE = join(process.cwd(), "data", "index", "vectors.json");

export interface Rec {
  id: string;
  vector: number[];
  payload: LawChunkPayload;
}

let cache: Rec[] | null = null;

/** Load the current index (empty if none) — used by resumable ingestion. */
export function loadIndexRaw(): Rec[] {
  if (!existsSync(FILE)) return [];
  return JSON.parse(readFileSync(FILE, "utf8")) as Rec[];
}

/** Persist the index — used to checkpoint after each ingest batch. */
export function saveIndexRaw(recs: Rec[]): void {
  mkdirSync(join(process.cwd(), "data", "index"), { recursive: true });
  writeFileSync(FILE, JSON.stringify(recs), "utf8");
  cache = recs;
}

export async function ensureLocalStore(): Promise<void> {
  // Nothing to provision; the index file is created on upsert.
}

export async function upsertLocal(chunks: LawChunk[], vectors: number[][]): Promise<void> {
  const recs: Rec[] = chunks.map((c, i) => ({ id: c.id, vector: vectors[i], payload: c.payload }));
  mkdirSync(join(process.cwd(), "data", "index"), { recursive: true });
  writeFileSync(FILE, JSON.stringify(recs), "utf8");
  cache = recs;
}

function load(): Rec[] {
  if (cache) return cache;
  if (!existsSync(FILE)) {
    throw new Error("Local vector index not found. Run `npm run ingest` first.");
  }
  cache = JSON.parse(readFileSync(FILE, "utf8")) as Rec[];
  return cache;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

export async function searchLocal(
  queryVector: number[],
  rawQuery: string,
  k: number,
): Promise<RetrievedChunk[]> {
  const recs = load();

  const dense: RetrievedChunk[] = recs
    .map((r) => ({ ...r.payload, id: r.id, score: cosine(queryVector, r.vector), matchType: "dense" as const }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  // Keyword leg: exact section-number tokens parsed from the query.
  const numbers = Array.from(
    rawQuery.matchAll(/\b(?:section|sec|article|art)\.?\s*([0-9]+[A-Za-z]?)\b/gi),
  ).map((m) => m[1].toLowerCase());
  const keyword: RetrievedChunk[] = numbers.length
    ? recs
        .filter((r) => numbers.includes(r.payload.sectionNumber.toLowerCase()))
        .map((r) => ({ ...r.payload, id: r.id, score: 0.95, matchType: "keyword" as const }))
    : [];

  const merged = new Map<string, RetrievedChunk>();
  for (const h of dense) merged.set(h.id, h);
  for (const h of keyword) {
    const prev = merged.get(h.id);
    if (!prev || h.score > prev.score) merged.set(h.id, h);
  }
  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, k);
}
