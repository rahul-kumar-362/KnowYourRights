# KnowYourRights (KYR) — System Architecture

> Phase 1 deliverable. "Every Indian deserves to know their rights."
> KYR is a **legal incident analyzer**: a citizen describes a real situation in any Indian language; the system returns a grounded, cited legal guidance report.

---

## 1. Design Principles

1. **Grounded, never fabricated.** Every statute, section, and judgment cited in a report MUST exist in retrieved source text. No section number is ever emitted from model memory alone. This is the central constraint of the whole system.
2. **Three-way provenance.** Every claim is labelled: `[Retrieved source]`, `[General guidance]`, or `[Model inference]`.
3. **Confidence gating.** Poor retrieval coverage → the system says *"I am not sufficiently confident"* rather than guessing.
4. **Educational, not advice.** Mandatory disclaimer on every response. No claim to replace a lawyer.
5. **Clean architecture.** Repository pattern, SOLID, typed end-to-end, no duplicated logic, testable boundaries.

---

## 2. High-Level Topology

```
                          ┌────────────────────────────────────────┐
   Browser (Next.js)      │  Web app: chat, upload, voice, report   │
   - chat UI              │  Next.js App Router + Tailwind + shadcn  │
   - doc/image upload     └───────────────┬──────────────────────────┘
   - voice (Web Speech)                   │ HTTPS (auth: Clerk/Auth.js)
   - language select                      │
                                          ▼
                          ┌────────────────────────────────────────┐
                          │  API layer (Next route handlers)        │
                          │  /api/analyze  /api/chat  /api/upload   │
                          │  rate-limit · validation · authz        │
                          └───────────────┬──────────────────────────┘
                                          │
                ┌─────────────────────────┼───────────────────────────────┐
                ▼                         ▼                               ▼
   ┌────────────────────┐   ┌──────────────────────────┐   ┌──────────────────────┐
   │ Orchestrator       │   │ RAG retrieval service     │   │ Worker (queue)       │
   │ (agent pipeline)   │◄─▶│ Qdrant (hybrid search)    │   │ ingestion · OCR ·    │
   │ Claude API         │   │ Voyage embeddings         │   │ audio transcription  │
   └─────────┬──────────┘   └──────────────────────────┘   └──────────┬───────────┘
             │                                                          │
             ▼                                                          ▼
   ┌────────────────────────────────────────────────────────────────────────────┐
   │ PostgreSQL (Prisma)  ·  Redis (cache/rate-limit/queue)  ·  Object store      │
   │ users, chats, incidents, documents, acts, sections, feedback, analytics     │
   └────────────────────────────────────────────────────────────────────────────┘
```

**Backend topology decision:** Next.js route handlers host the synchronous request path (analyze/chat/upload). A **separate worker process** (queue-driven) owns slow/async jobs: corpus ingestion, OCR of large scans, audio transcription. This keeps the request path fast and the heavy lifting horizontally scalable. Express is only introduced if/when the worker grows beyond a queue consumer.

---

## 3. Request Lifecycle — incident → report

1. **Input** — user submits text (any Indian language) ± uploaded documents/images/audio.
2. **Preprocess** — uploads normalized: PDFs/images → Claude vision (native); audio → transcription service → text; everything reduced to a text+attachments payload.
3. **Agent pipeline** (Section 4) runs.
4. **Verifier gate** — every cited section is cross-checked against retrieved source text. Unsupported claims are dropped or flagged.
5. **Render** — the 14-section report streams back to the UI in the user's chosen language.
6. **Persist** — incident, messages, citations, and feedback hooks saved to Postgres.

---

## 4. Agent Pipeline

The prompt specifies 7 agents. Running 7 sequential LLM calls per query is slow and costly, so they map onto **4 actual model calls** while preserving every agent's responsibility. (7 logical roles, 4 physical calls.)

| # | Agent (logical) | Physical call | Model | Output |
|---|---|---|---|---|
| 1 | Incident Analyzer | Call A | `claude-haiku-4-5` | structured JSON: entities, timeline, people, evidence, crime type, legal issues, rights violated |
| 2 | Law Retriever | (no LLM) | Voyage + Qdrant | candidate statute/judgment chunks from RAG |
| 3 | Section Matcher | Call B | `claude-opus-4-8` | exact applicable sections, **only** from retrieved chunks, with metadata |
| 4 | Evidence Analyzer | Call B (same) | `claude-opus-4-8` | maps user evidence ↔ what each offence requires |
| 5 | Legal Advisor | Call B (same) | `claude-opus-4-8` | drafts report sections 1–13 |
| 6 | Action Planner | Call B (same) | `claude-opus-4-8` | checklist, authorities, documents, timeline, outcomes |
| 7 | Response Verifier | Call C | `claude-opus-4-8` (fresh context) | adversarial check: every (Act, Section) must appear in retrieved text; else drop/flag/downgrade confidence |

- **Call A** is cheap/fast extraction (Haiku, low effort).
- **Retrieval** is pure vector + keyword search, no LLM.
- **Call B** is the heavy grounded generation (Opus, high effort, structured output) — Matcher+Evidence+Advisor+Planner fused so they share one retrieved-context window (cheaper, coherent).
- **Call C** is an independent skeptic. It does NOT see Call B's reasoning, only the claims + the retrieved sources, and tries to refute each citation. This is the hallucination firewall.
- **Prompt caching**: the large system prompt + retrieved corpus prefix are cached across calls B and C (same model) to cut cost/latency.

---

## 5. RAG Subsystem

**Corpus (sourced from official material only):**
Constitution of India · BNS · BNSS · BSA · major Central Acts · relevant State Acts · landmark SC/HC judgments · government & gazette notifications · official FAQs. Primary source: `indiacode.nic.in` and official ministry publications.

**Ingestion pipeline (worker):**
```
official doc → clean/normalize → chunk by section (preserve boundaries)
            → attach metadata → embed (Voyage) → upsert to Qdrant + Postgres
```

**Chunking:** one chunk per legal section/article (not fixed token windows) — legal retrieval needs section-level granularity. Long sections split with overlap, section header repeated.

**Chunk metadata (per vector):**
```
act_name, act_short_code, section_number, section_title, text,
punishment, bailable, cognizable, compoundable,   # from BNSS First Schedule — sourced, not inferred
jurisdiction (central/state), source_url, last_amended, doc_type (statute|judgment|notification)
```

**Embeddings:** `voyage-law-2` — Voyage's legal-domain model (purpose-built for statutes/case law; far better than general embeddings on legal text). 1024-dim.

**Retrieval = hybrid (dense + sparse/BM25).** Pure dense misses exact tokens like "Section 318" or "BNS 63"; BM25 catches them. Qdrant supports hybrid natively. Top-k with score threshold → low score triggers the confidence-gate fallback.

**Vector DB: Qdrant** (recommended) — open-source, self-hostable, free, hybrid search, good metadata filtering. Pinecone (managed, paid) or Weaviate are drop-in alternatives behind the repository interface.

---

## 6. Hallucination / Grounding Controls (legal-safety core)

1. **Retrieval-bound generation** — Section Matcher prompt forbids emitting any section not present in the retrieved context.
2. **Verifier pass (Call C)** — independent model confirms each (Act, Section, punishment, bailable/cognizable/compoundable) against the retrieved chunk. Mismatch → drop the row or mark `⚠ unverified`.
3. **Confidence gate** — if top retrieval scores are below threshold or coverage is thin → emit *"I am not sufficiently confident…"* instead of a report.
4. **Provenance labels** — `[Retrieved source]` / `[General guidance]` / `[Model inference]` on every substantive claim.
5. **No judgment fabrication** — case citations only when a matching judgment chunk was retrieved.
6. **Mandatory disclaimer** appended to every response.

---

## 7. Data Model (PostgreSQL via Prisma)

| Entity | Purpose |
|---|---|
| `User` | account, language preference, role |
| `Chat` | a conversation thread |
| `Message` | user/assistant turns, attachments ref |
| `Incident` | extracted structured incident (Agent 1 output) |
| `Document` | uploaded FIR/notice/order/image/audio + storage key + OCR/transcript text |
| `LegalSource` | a source document (statute/judgment/notification) + provenance |
| `Act` | act registry (name, short code, jurisdiction) |
| `Section` | section registry + classification flags (mirrors Qdrant metadata for SQL queries/joins) |
| `Citation` | links a Message → Section/LegalSource actually cited (audit trail) |
| `Feedback` | user rating + correction on a report |
| `Analytics` | event log (queries, languages, retrieval hits/misses) |

Vectors live in Qdrant; `Section`/`LegalSource` in Postgres hold the canonical metadata + provenance and join key. This separation keeps SQL queryable and vectors fast.

---

## 8. Multimodal Handling

| Input | Mechanism |
|---|---|
| Text | direct |
| PDF (FIR, notice, court order) | Claude `document` content block (native, no separate OCR) |
| Image / scanned doc | Claude vision (native OCR + understanding) |
| Audio | **external transcription service** (e.g. Whisper-class) → text. Claude has no audio input. |
| Voice input | browser Web Speech API client-side, or record → transcription service |

---

## 9. Multi-Language Strategy

Claude understands and generates Hindi, English, Marathi, Tamil, Telugu, Bengali, Gujarati, Punjabi, Malayalam, Kannada, Urdu, and Hinglish natively. Strategy: **detect input language, retrieve over the (English) legal corpus, generate the report in the user's chosen output language.** Legal section numbers/act names kept verbatim; explanations localized. No separate translation layer needed for v1.

---

## 10. Tech Stack (final picks)

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Framer Motion | per spec; dark/minimal Apple·Notion·Linear feel |
| API | Next.js route handlers | synchronous request path; no separate server until needed |
| Worker | Node queue consumer (BullMQ on Redis) | ingestion, OCR, transcription |
| LLM | Claude — `claude-opus-4-8` (reasoning/verify), `claude-haiku-4-5` (extraction) | accuracy where it matters, cheap where it doesn't |
| Embeddings | Voyage `voyage-law-2` | legal-domain specialized |
| Vector DB | Qdrant | open-source, hybrid search, self-host/free |
| DB | PostgreSQL + Prisma | relational integrity, repository pattern |
| Cache/queue | Redis | rate-limit, cache, BullMQ |
| Auth | Clerk (recommended) or Auth.js | fast, secure, PII-aware |
| Storage | Supabase Storage (or S3) | uploads |
| Deploy | Vercel (web/API) + Docker (Qdrant/Redis/Postgres/worker) on Railway | per spec |

---

## 11. Security

Encryption at rest + in transit · signed/scanned uploads with type+size limits · Redis rate-limiting per IP+user · Clerk/Auth.js authn + route authz · PII minimization & redaction in logs · Zod input validation on every endpoint · Prisma (parameterized) to prevent SQLi · React escaping + CSP for XSS · CSRF tokens on mutations · secrets in env/secret-manager, never in code.

---

## 12. Phased Roadmap (per prompt)

| Phase | Deliverable | Status |
|---|---|---|
| 1 | Architecture | ◀ **this doc — awaiting approval** |
| 2 | Folder structure | pending |
| 3 | Database (Prisma schema) | pending |
| 4 | Backend APIs | pending |
| 5 | Authentication | pending |
| 6 | AI engine (agent pipeline) | pending |
| 7 | RAG (ingestion + retrieval) | pending |
| 8 | Frontend | pending |
| 9 | Testing | pending |
| 10 | Deployment | pending |

---

## 13. Reality Check / Risks

- **Legal corpus sourcing** is the critical path and is largely data work, not code. Accuracy of section text and the bailable/cognizable/compoundable flags depends entirely on ingesting correct official sources (BNSS First Schedule, etc.). Code can be perfect and the product still wrong if the corpus is wrong.
- **External dependencies / keys**: Anthropic, Voyage, Qdrant host, transcription service, Clerk, Supabase. Several are paid.
- **Legal liability**: grounding + confidence-gate + disclaimer must be airtight before any public exposure.
- **Realistic v1**: a vertical slice (text incident → grounded report over a seeded BNS/BNSS subset → verifier → 14-section render) that is genuinely production-quality, then widen corpus + add multimodal/voice/multilang.

---

## 14. Open Decisions (need answers before Phase 2)

1. Vector DB: Qdrant (recommended) vs Pinecone vs Weaviate.
2. Auth: Clerk (recommended) vs Auth.js.
3. Build strategy: full-stack-now vs MVP vertical slice first (recommended).
4. Audio/voice: in v1 or deferred to a later phase.
