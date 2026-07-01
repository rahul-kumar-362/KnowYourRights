# Code Reference Cheatsheet

Exact files to pull up live in an interview instead of describing from memory. Grouped by what
question they answer.

## "Show me the pipeline"

| File | What it is |
|---|---|
| `src/lib/ai/orchestrator.ts` | The whole pipeline in ~65 lines: `runAnalysis()` calls analyze → retrieve → advise → verify → filter. Start here for any "walk me through it" question. |
| `src/app/api/analyze/route.ts` | The HTTP entrypoint — rate limiting, request validation (Zod), calling the orchestrator, best-effort persistence, error handling. |

## "Show me the anti-hallucination mechanism"

| File | What it is |
|---|---|
| `src/lib/ai/agents/verifier.ts` | Agent 4 — the adversarial verification call. Note it's a completely separate `runStructured` call with its own system prompt, not a continuation of the drafting conversation. |
| `src/lib/ai/prompts/verifier.ts` | The actual verifier system prompt — read this if asked "how do you word the instruction to be adversarial." |
| `src/lib/ai/schemas.ts` → `VerificationSchema` | The two-axis output shape: `verdict: confirmed\|unsupported\|mismatch` + `relevant: boolean` per law. |
| `src/lib/ai/orchestrator.ts` lines ~42–55 | Where the filter actually happens — `confirmed = verdict === "confirmed" && relevant`. |

## "Show me the RAG internals"

| File | What it is |
|---|---|
| `src/lib/rag/chunker.ts` | Corpus → chunk conversion, deterministic ids, the 1,600/200 char split. |
| `src/lib/rag/embeddings.ts` | The pluggable embedding dispatch (`local`/`gemini`/`voyage`), the BGE query-prefix handling, retry/backoff. |
| `src/lib/rag/localStore.ts` | The hybrid search implementation — dense cosine + keyword section-number matching, merged and sorted. |
| `src/lib/rag/retriever.ts` | The confidence threshold (`CONFIDENCE_THRESHOLD = 0.5`) and the `retrieveMany` multi-query merge. |
| `src/lib/rag/store.ts` | The provider-agnostic dispatcher — proof that swapping `local`→`qdrant` doesn't touch calling code. |

## "Show me the structured-output / multi-provider LLM layer"

| File | What it is |
|---|---|
| `src/lib/ai/client.ts` | Both provider paths (`runAnthropic`, `runGemini`) behind one `runStructured()` function; the Gemini path's manual JSON-schema + Zod re-validation is the interesting bit. |
| `src/lib/ai/schemas.ts` | Every Zod schema in the pipeline — the single source of truth for what a "report" or "verification" object looks like. |

## "Show me the corpus / data pipeline"

| File | What it is |
|---|---|
| `scripts/build-corpus/indiacode.ts` | The generic scraper reused for 6+ acts — shows the count-assertion pattern ("fail loudly, never write a truncated corpus"). |
| `scripts/build-corpus/bnssFirstSchedule.ts` | The more complex scraper — parses the NCRB HTML table for cognizable/bailable/court classification, including the sub-row inheritance logic. |
| `data/corpus/derived/validation-sample.json` | The independent ground-truth sample used to validate scraper output (15/15 and 14/14 matches). |
| `src/lib/legal/classify.ts` | The extracted, unit-tested pure functions (`normCognizable`, `normBailable`, etc.) shared by both BNSS scrapers — mention this if asked about test strategy. |

## "Show me the frontend architecture"

| File | What it is |
|---|---|
| `src/components/chat/Analyzer.tsx` | The composer UI — note the `dynamic(..., { ssr: false })` import of `ReportView`, the code-splitting example. |
| `src/components/report/ReportView.tsx` | The 14-section report rebuilt as a dashboard — verification-verdict badges, Print/PDF, staggered mount animation. |
| `src/components/shell/AppShell.tsx` | The app shell — note the Radix `Dialog` used for the mobile drawer (the a11y fix story), and the dynamic `CommandPalette` import. |
| `src/app/globals.css` | The design token system (`:root`/`.dark` HSL variables) and the `@media print` block that neutralizes animation for PDF export. |
| `src/lib/auth/clerk.ts` | The one-liner that fixed the placeholder-key bug: `key?.startsWith("pk_") && !key.includes("xxxx")`. |

## "Show me the deployment"

| File | What it is |
|---|---|
| `Dockerfile` | Multi-stage build — note the build stage runs the full local-embedding ingest, so the runtime image starts with a warm index and only needs an LLM key. |
| `docs/DEPLOYMENT.md` | Both deployment paths (Docker/Node host vs. Vercel+managed), and the persistence caveat for SQLite-in-a-container. |

## Quick facts to have memorized (all independently verified against the repo, not just recalled)

- **12** legal codes, **2,055** total sections/articles, embedded as **2,801** vector chunks.
- Embedding model: **bge-small-en-v1.5**, 384 dimensions, local via transformers.js.
- Retrieval confidence threshold: **0.5** cosine similarity.
- Default LLM: **Gemini 2.5 Flash**; pluggable to Claude Opus (reasoning) / Haiku (extraction).
- **4** actual model calls per analysis (analyze, advise, verify — retrieval is not a model call).
- Rate limits: **12/min** on `/api/analyze`, **20/min** on `/api/extract`, per IP.
- **17** unit tests (Vitest), scoped to grounding-critical parsers.
- Frontend perf win: First Load JS down **24–35%** across main routes after code-splitting.
- Chunk size: **1,600 chars**, **200 char** overlap for long sections.
