/**
 * Corpus ingestion: read data/corpus/*.json → section-aware chunk →
 * embed → vector store.
 *
 * Local store (default): resumable + checkpointed — saves after every batch and
 * skips already-embedded chunks on re-run, so a killed/flaky run just resumes.
 * Qdrant: single bulk upsert.
 *
 * Run: npm run ingest
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { CorpusFile } from "@/lib/rag/chunker";

function loadEnv() {
  const path = join(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

async function main() {
  const { chunkCorpusFile } = await import("@/lib/rag/chunker");
  const { embedDocuments } = await import("@/lib/rag/embeddings");
  const { env } = await import("@/lib/config/env");

  const dir = join(process.cwd(), "data", "corpus");
  if (!existsSync(dir)) throw new Error(`Corpus directory not found: ${dir}`);
  let files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  // INGEST_ONLY=bns.json,wages.json restricts to a subset (faster on free tiers).
  const only = (process.env.INGEST_ONLY ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (only.length) files = files.filter((f) => only.includes(f));
  if (files.length === 0) throw new Error("No corpus .json files found in data/corpus/");

  const all: Awaited<ReturnType<typeof chunkCorpusFile>> = [];
  for (const f of files) {
    const raw = JSON.parse(readFileSync(join(dir, f), "utf8")) as CorpusFile;
    const chunks = chunkCorpusFile(raw);
    all.push(...chunks);
    console.log(`  ${f}: ${chunks.length} chunks`);
  }

  if (env().VECTOR_STORE === "local") {
    const { loadIndexRaw, saveIndexRaw } = await import("@/lib/rag/localStore");
    const recs = loadIndexRaw();
    const done = new Set(recs.map((r) => r.id));
    const todo = all.filter((c) => !done.has(c.chunk.id));
    console.log(`Local store: ${recs.length} already embedded, ${todo.length} to go.`);

    const B = 50;
    for (let i = 0; i < todo.length; i += B) {
      const slice = todo.slice(i, i + B);
      const vecs = await embedDocuments(slice.map((c) => c.embedText));
      slice.forEach((c, j) => recs.push({ id: c.chunk.id, vector: vecs[j], payload: c.chunk.payload }));
      saveIndexRaw(recs); // checkpoint
      console.log(`  embedded ${Math.min(i + B, todo.length)}/${todo.length} (index: ${recs.length})`);
    }
    console.log(`Done. Local index holds ${recs.length} vectors.`);
    return;
  }

  // Qdrant: bulk path.
  const { ensureStore, upsertChunks } = await import("@/lib/rag/store");
  console.log(`Embedding ${all.length} chunks…`);
  const vectors = await embedDocuments(all.map((c) => c.embedText));
  console.log("Ensuring vector store…");
  await ensureStore();
  console.log("Upserting…");
  await upsertChunks(all.map((c) => c.chunk), vectors);
  console.log(`Done. Ingested ${all.length} chunks.`);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
