# KnowYourRights — Folder Structure

Phase 2 deliverable. Single Next.js app (App Router) hosting both UI and API, plus a worker stub for later async jobs. `★` marks files the **MVP vertical slice** implements first.

```
knowyourrights/
├── docs/
│   ├── ARCHITECTURE.md            # Phase 1
│   └── FOLDER_STRUCTURE.md        # this file
├── prisma/
│   └── schema.prisma          ★   # Phase 3 — data model
├── data/
│   └── corpus/                ★   # seed legal sources (BNS/BNSS subset) for ingestion
│       └── bns/
├── scripts/
│   └── ingest.ts              ★   # corpus → chunk → embed → Qdrant
├── public/                        # static assets
├── src/
│   ├── app/                       # Next App Router
│   │   ├── layout.tsx         ★   # root layout, ClerkProvider, theme
│   │   ├── page.tsx           ★   # landing
│   │   ├── globals.css        ★   # tailwind + dark theme tokens
│   │   ├── (app)/
│   │   │   └── chat/page.tsx  ★   # main analyzer UI
│   │   └── api/
│   │       ├── analyze/route.ts ★ # CORE: incident → grounded report
│   │       ├── chat/route.ts      # follow-up Q&A on an incident
│   │       └── upload/route.ts    # doc/image upload (Phase: multimodal)
│   ├── components/
│   │   ├── ui/                    # shadcn primitives (button, card, ...)
│   │   ├── chat/              ★   # ChatInput, MessageList, LanguageSelect
│   │   └── report/           ★   # ReportView + renderers for the 14 sections
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── client.ts      ★   # Anthropic SDK client
│   │   │   ├── orchestrator.ts ★  # runs the 4-call agent pipeline
│   │   │   ├── agents/
│   │   │   │   ├── incidentAnalyzer.ts ★  # Agent 1 (Call A, Haiku)
│   │   │   │   ├── advisor.ts          ★  # Agents 3-6 (Call B, Opus)
│   │   │   │   └── verifier.ts         ★  # Agent 7 (Call C, Opus)
│   │   │   ├── prompts/       ★   # system prompts per agent
│   │   │   └── schemas.ts     ★   # zod schemas for structured output
│   │   ├── rag/
│   │   │   ├── embeddings.ts  ★   # Voyage voyage-law-2 (fetch)
│   │   │   ├── qdrant.ts      ★   # client + hybrid search
│   │   │   ├── retriever.ts   ★   # Agent 2: query → chunks
│   │   │   └── chunker.ts     ★   # section-aware chunking
│   │   ├── db/
│   │   │   ├── prisma.ts      ★   # client singleton
│   │   │   └── repositories/      # repository pattern (incident, chat, citation)
│   │   ├── auth/                  # Clerk helpers
│   │   ├── validation/       ★   # zod request schemas
│   │   ├── ratelimit.ts          # Redis rate-limit
│   │   ├── logger.ts         ★   # structured logging
│   │   └── config/
│   │       └── env.ts        ★   # typed env validation (zod)
│   ├── types/                ★   # shared TS types (Report, Incident, ...)
│   └── worker/
│       └── index.ts              # BullMQ consumer (ingestion/OCR/audio — later)
├── tests/                        # Phase 9
├── .env.example              ★
├── .gitignore                ★
├── docker-compose.yml        ★   # qdrant + redis + postgres (local dev)
├── tailwind.config.ts        ★
├── postcss.config.mjs        ★
├── next.config.mjs           ★
├── tsconfig.json             ★
└── package.json              ★
```

## Folder responsibilities

- **`docs/`** — architecture + design records (this phased process).
- **`prisma/`** — DB schema + migrations. Single source of truth for relational data.
- **`data/corpus/`** — raw official legal source documents to ingest. The accuracy of the whole product lives here.
- **`scripts/ingest.ts`** — offline pipeline: read corpus → section-aware chunk → embed (Voyage) → upsert vectors to Qdrant + metadata to Postgres.
- **`src/app/`** — routes. `api/analyze` is the core endpoint; UI under `(app)/chat`.
- **`src/components/`** — `ui/` = shadcn primitives; `chat/` + `report/` = feature components. Report renderers map 1:1 to the 14 output sections.
- **`src/lib/ai/`** — the agent pipeline. `orchestrator.ts` sequences Call A → retrieve → Call B → Call C. Prompts isolated in `prompts/`; structured-output contracts in `schemas.ts`.
- **`src/lib/rag/`** — embeddings, Qdrant, retriever (Agent 2), chunker. Vector DB hidden behind `qdrant.ts` so it can be swapped (Pinecone/Weaviate) without touching callers.
- **`src/lib/db/repositories/`** — repository pattern; the only place that talks to Prisma. Keeps persistence swappable and testable.
- **`src/lib/config/env.ts`** — fail-fast typed env. No raw `process.env` elsewhere.
- **`src/worker/`** — async jobs (ingestion at scale, OCR, transcription). Stub now, grows in multimodal phase.
- **`tests/`** — unit (chunker, schemas, verifier logic) + integration (analyze route).

## Architectural guarantees this layout enforces

- **Grounding isolated**: `verifier.ts` + `retriever.ts` are the only path citations can come from.
- **Provider-swappable**: Qdrant, Clerk, Anthropic each behind a single module.
- **No leaky persistence**: only repositories import Prisma.
- **Typed boundaries**: zod at every external edge (env, requests, LLM structured output).
