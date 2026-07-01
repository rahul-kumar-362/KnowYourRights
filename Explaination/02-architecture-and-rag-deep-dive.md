# Architecture & RAG Deep Dive

This is the technical core. Everything here is grounded in the actual source — see
[`06-code-reference-cheatsheet.md`](06-code-reference-cheatsheet.md) for exact file:line pointers.

## The pipeline, end to end

```
POST /api/analyze { text, language }
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ orchestrator.runAnalysis()  — src/lib/ai/orchestrator.ts     │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
1. analyzeIncident(rawText, language)          — Agent 1 (Incident Analyzer)
   → { summary, entities, timeline, crimeTypes, legalIssues,
       rightsViolated, retrievalQueries[3-6] }
        │
        ▼
2. retrieveMany(analysis.retrievalQueries)     — Agent 2 (Law Retriever)
   → embeds each query → hybrid search (dense + keyword) over the
     local vector index → dedupe by chunk id, keep best score →
     { chunks[], topScore, confident }
        │
        ▼
3. adviseReport(analysis, chunks, language)    — Agent 3 (Advisor)
   → drafts the 14-section report; system prompt forbids citing
     any section not present in the retrieved chunks
        │
        ▼
4. verifyReport(report.applicableLaws, chunks, report.incidentSummary)  — Agent 4 (Verifier)
   → fresh model call, adversarial framing: for each cited law,
     independently decide (a) is it actually IN the retrieved
     sources (grounding) and (b) do the incident's stated facts
     satisfy its legal elements (relevance)
        │
        ▼
5. orchestrator filters report.applicableLaws to only
   { verdict: "confirmed", relevant: true } — everything else is
   dropped and logged (never shown to the user)
        │
        ▼
   confident = retrieval.confident && verification.overallConfident
        │
        ▼
   AnalysisResult { analysis, report, verification, confident,
                    retrievalTopScore, disclaimer }
```

Despite "7 logical agents" in the original spec, this collapses to **4 actual model calls**
(analyze, advise, verify — retrieval is not a model call, it's embed + vector search). The
advisor call internally handles what would otherwise be 4 separate agents (matcher / evidence /
advisor / planner) in a single structured generation, because splitting them into separate calls
bought nothing — they all need the same context (the incident + retrieved chunks) and produce
parts of the same report object.

## Why 4 calls and not 1

**Q you'll get asked: "why not just do this in one prompt?"**

Because grounding requires a query that doesn't exist until you've understood the incident. You
can't retrieve relevant statutes before you know what legal issues are actually present — that's
what Agent 1 is for (`retrievalQueries` is literally part of its output schema). And you can't
trust the drafting model to police its own citations — that's a well-known failure mode
(self-verification bias). Splitting verification into a **separate call with a fresh context and
an adversarial system prompt** (`VERIFIER_SYSTEM` in `src/lib/ai/prompts/verifier.ts`) means the
verifier isn't anchored on its own prior reasoning; it's grading someone else's work from scratch
against the same source material.

## RAG internals

### Chunking (`src/lib/rag/chunker.ts`)

- Corpus files are per-act JSON (`data/corpus/bns.json`, etc.) with a flat `sections[]` array —
  `{ number, title, text, punishment, bailable, cognizable, compoundable }`.
- Long sections (> 1,600 chars) are split with 200-char overlap so no chunk boundary silently cuts
  a legal element in half.
- **Chunk ids are deterministic** — a SHA-1 hash of `${actShortCode}:${sectionNumber}[:part]`. This
  means re-running ingestion **updates chunks in place** instead of duplicating them; ingestion is
  naturally idempotent.
- The embedded text isn't just the raw section text — it's prefixed with
  `"{ACT} Section {number} — {title}\n{text}"` so exact-section semantics (which act, which
  number) are baked into the embedding itself, not just stored as metadata.

### Embeddings (`src/lib/rag/embeddings.ts`)

- **Pluggable via `EMBED_PROVIDER`**: `local` (transformers.js, default) | `gemini` | `voyage`.
- **Live default = local**, using `bge-small-en-v1.5` (384-dim). This model uses **CLS pooling**
  and a **query-side instruction prefix** (`"Represent this sentence for searching relevant
  passages: "`) — documents are embedded plain, queries get the prefix. This asymmetry is a known
  BGE-family requirement, detected in code via `/bge|gte/i.test(model)`.
- Retry/backoff logic on the two API-based providers (`voyage`, `gemini`) handles network drops
  and 429 rate limits with exponential backoff — because the earlier free-tier providers (Voyage:
  3 RPM, Gemini embeddings: daily quota) were both exhausted during development, which is *why*
  local embeddings became the default.

### Vector store (`src/lib/rag/store.ts` → `localStore.ts` / `qdrant.ts`)

- **Pluggable via `VECTOR_STORE`**: `local` (default) | `qdrant`.
- Local store: embeddings persisted to a flat JSON file (`data/index/vectors.json`), **brute-force
  cosine similarity** computed in memory at query time. No index structure (no HNSW/IVF) — this is
  a deliberate simplicity/cost tradeoff, viable because the corpus is small (2,801 vectors).
- **"Hybrid search" = dense + keyword, not dense + sparse-BM25.** The keyword leg regex-parses the
  raw query for explicit section references (`/\b(?:section|sec|article|art)\.?\s*([0-9]+[A-Za-z]?)\b/gi`)
  and, if found, force-includes chunks with a matching `sectionNumber` at a fixed high score
  (0.95). This means "what does Section 420 say" gets that exact chunk even if the semantic
  embedding match for "420" alone would be weak — dense search is good at *meaning*, bad at
  *exact identifiers*.
- Results from both legs are merged by chunk id (keep the higher score), sorted, and truncated to
  `k` (default 8, doubled to `k*2` when merging results from multiple retrieval queries in
  `retrieveMany`).

### The confidence gate (`src/lib/rag/retriever.ts`)

- `CONFIDENCE_THRESHOLD = 0.5` — calibrated empirically for `bge-small-en-v1.5` on this corpus:
  off-topic queries score ~0.46–0.51, on-topic legal queries ~0.57–0.73. This value moved from an
  earlier `0.4` after switching embedding models (MiniLM → BGE), because the score distributions
  shifted.
- If the **top retrieval score** is below threshold, `confident: false` propagates through the
  whole pipeline (even if the LLM still drafts a report) and the UI shows an explicit low-
  confidence warning banner instead of presenting the report as authoritative.
- This threshold is a **soft gate, not the only gate** — the verifier's relevance check is the
  real backstop for borderline-confident retrievals, because a query can score just above 0.5 by
  accident (e.g. shared legal vocabulary) without the retrieved section actually being applicable.

## The verification / grounding mechanism (the centerpiece)

This is the single most interview-worthy design decision in the project, because it's the direct
answer to "how do you stop an LLM from making things up in a domain where that's dangerous."

**Two independent axes**, both must pass, per cited law:

| Axis | Question | Failure mode it catches |
|---|---|---|
| **Grounding** (`verdict: confirmed \| unsupported \| mismatch`) | Does this exact act + section exist in the chunks that were actually retrieved? | Model cites a real-sounding but non-existent section, or misremembers section text from training data instead of the provided context |
| **Relevance** (`relevant: boolean`) | Do the incident's *stated facts* actually satisfy this section's legal elements? | Model retrieves a real section (grounded!) but over-applies it — e.g. citing organised-crime provisions (BNS §111/112) for a single ordinary scam, because the section's *text* mentions "fraud" even though its *elements* (e.g. a continuing criminal syndicate) aren't met |

```ts
// src/lib/ai/orchestrator.ts
const confirmed = new Set(
  verification.verifiedLaws
    .filter((v) => v.verdict === "confirmed" && v.relevant)
    .map((v) => key(v)),
);
report.applicableLaws = report.applicableLaws.filter((l) => confirmed.has(key(l)));
```

Anything that fails either check is silently dropped from the final report (logged as a warning,
never shown to the user) — the system fails toward *saying less* rather than *saying something
wrong*.

**Concrete example this design caught during development** (real, from project history): a
landlord-lockout incident initially got cited under BNS §314 (misappropriation), which is
semantically adjacent but legally wrong — the verifier's relevance check corrected it toward
house-trespass (§329/§332), which actually matches the fact pattern.

## The two-tier "provenance vs. applicability" distinction shown in the UI

Beyond the verifier's binary keep/drop, each surviving law carries two more signals shown to the
user:
- `provenance`: `"Retrieved source"` | `"General guidance"` | `"Model inference"` — how directly
  this citation traces back to a retrieved chunk.
- `applicability`: `"direct"` | `"conditional"` — does the incident as stated clearly satisfy this
  offence, or only under additional facts not yet confirmed?

This is deliberate transparency: even a *verified* citation can be flagged "conditional" so the
user understands it's not an unconditional finding.

## Why this design generalizes (if asked "how would you extend this")

- **Add a new legal code**: write/reuse a scraper into `data/corpus/<code>.json` matching the
  `CorpusFile` shape, run `npm run ingest` — chunking, embedding, and retrieval all pick it up
  automatically with no pipeline changes.
- **Swap any infra layer independently**: LLM, embedding provider, and vector store are each
  behind their own env-var-selected dispatch function (`client.ts`, `embeddings.ts`, `store.ts`).
  None of the agent code imports a concrete provider directly.
- **Add multi-turn conversation**: the `Chat`/`Message` Prisma models already exist; the analyzer
  is single-shot today by product choice, not by architectural limitation.
