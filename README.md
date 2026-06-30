# KnowYourRights (KYR)

> Every Indian deserves to know their rights.

KYR is an AI **legal incident analyzer** for Indian citizens. Describe an incident in any
Indian language; KYR identifies the applicable laws (BNS / BNSS / BSA, Acts, constitutional
rights) and returns a structured, **source-grounded** guidance report telling you what to do next.

This repository currently contains the **MVP vertical slice**: text incident → grounded
14-section report, with an adversarial verifier that drops any citation not backed by a
retrieved source.

---

## How it works

```
incident text
   │
   ▼  Agent 1 — Incident Analyzer (Claude Haiku, structured extraction)
analysis + retrieval queries
   │
   ▼  Agent 2 — Law Retriever (Voyage voyage-law-2 + Qdrant hybrid search)
grounded statute chunks
   │
   ▼  Agents 3-6 — Advisor (Claude Opus, grounded generation)
14-section report (draft)
   │
   ▼  Agent 7 — Verifier (Claude Opus, adversarial)
only verifier-confirmed citations survive → final report
```

Design detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) ·
layout: [`docs/FOLDER_STRUCTURE.md`](docs/FOLDER_STRUCTURE.md).

---

## Quick start

Runs **fully free / offline-capable** by default: local embeddings (transformers.js) + local file vector store — **no Docker, no Qdrant, no Anthropic key needed**. Only the LLM calls hit the network.

### 1. Prerequisites
- Node 20+
- One LLM key: a free **Gemini** key (`aistudio.google.com/apikey`) — or an Anthropic key.
- Defaults: `LLM_PROVIDER=gemini`, `EMBED_PROVIDER=local`, `VECTOR_STORE=local`. Switch any of them in `.env`.

### 2. Install + configure
```bash
npm install
cp .env.example .env       # then fill GEMINI_API_KEY
```
Providers (all in `.env`): `LLM_PROVIDER` = `gemini` | `anthropic` · `EMBED_PROVIDER` = `local` | `gemini` | `voyage` · `VECTOR_STORE` = `local` | `qdrant`.

### 3. Build + ingest the legal corpus
```bash
npm run build:bns             # 358 official BNS sections from indiacode.nic.in → data/corpus/bns.json
npm run build:bnss-schedule   # official NCRB BNSS First Schedule HTML → cognizable/bailable/court into bns.json
npm run build:corpus -- bnss  # 531 official BNSS sections → data/corpus/bnss.json
npm run build:corpus -- bsa   # 170 official BSA sections → data/corpus/bsa.json
npm run build:corpus -- itact # 125 official IT Act 2000 sections → data/corpus/ita.json
npm run build:corpus -- wages # 69 official Code on Wages 2019 sections → data/corpus/wages.json
npm run build:constitution    # 308 Constitution articles (official PDF) → data/corpus/constitution.json
# special acts (all via the generic indiacode scraper):
npm run build:corpus -- consumer  # Consumer Protection 2019 (107)
npm run build:corpus -- rti       # Right to Information 2005 (31)
npm run build:corpus -- pocso     # POCSO 2012 (47)
npm run build:corpus -- dv        # Domestic Violence 2005 (37)
npm run build:corpus -- mv        # Motor Vehicles 1988 (180)
npm run build:corpus -- rera      # RERA 2016 (92)
npm run ingest                # embeds ALL data/corpus/*.json into the vector store (local by default; resumable)
npm run test:retrieve         # verify retrieval (local, no LLM) across the corpus
```
Scrapers fetch verbatim official text (no hand-authored statutes) and assert full section counts —
a blocked/partial scrape fails loudly rather than writing a truncated corpus. `ingest` is resumable
(checkpoints per batch); `INGEST_ONLY=bns.json,wages.json` restricts to a subset.

### 4. Run
```bash
# Verify the whole pipeline from the CLI (no web server):
npm run test:analyze -- "My employer hasn't paid my salary for 3 months"
# Or the web app:
npm run dev                # http://localhost:3000  →  /chat
```
The pipeline (query embed → retrieve → analyze → advise → verify → 14-section grounded report) is
**verified working end-to-end** on the local store + Gemini.

---

## ⚠️ Legal-accuracy warning (read this)

Corpus status by source:

| Source | Status |
|---|---|
| **BNS (358 sections)** | ✅ **Real, official, verbatim** — scraped from indiacode.nic.in via `npm run build:bns`. Section text + punishment are authoritative. |
| BNS cognizable / bailable / court | ✅ **Parsed from the official NCRB BNSS First Schedule HTML** via `npm run build:bnss-schedule` (288/358 offence sections; rest are definitions/procedure). Sub-section conflicts marked "Varies by sub-section". **Validated 15/15** against an independent multi-source ground-truth sample (`data/corpus/derived/validation-sample.json`). Per-row data in `data/corpus/derived/bns-first-schedule.json`. |
| BNS compoundable | ✅ **From BNSS §359** via `npm run build:compounding` (parses the §359(1)/(2) compounding tables already in `bnss.json`). 42 compoundable (34 without / 8 with court permission), rest non-compoundable. **Validated 14/14** vs ground-truth sample. |
| **BNSS (531 sections)** | ✅ **Real, official, verbatim** — `npm run build:corpus -- bnss` (indiacode show-data). Criminal procedure. |
| **BSA (170 sections)** | ✅ **Real, official, verbatim** — `npm run build:corpus -- bsa` (indiacode show-data). Evidence law. |
| **Constitution (308 articles)** | ✅ **Real, official** — `npm run build:constitution` (parsed from the Legislative Dept 2024 PDF). Article bodies only; 12 Schedules excluded; footnote/amendment markers may appear inline. |
| **IT Act 2000 (125 sections)** | ✅ **Real, official, verbatim** — `npm run build:corpus -- itact` (indiacode show-data). Cyber law (incl. 66C/66D). |
| **Code on Wages 2019 (69 sections)** | ✅ **Real, official, verbatim** — `npm run build:corpus -- wages` (indiacode show-data). Labour/wages. |

**All seed corpus replaced — 1561 real sections/articles across 6 codes (BNS, BNSS, BSA, Constitution, IT Act, Code on Wages).**

**The grounding system is only as correct as the corpus.** The verifier checks that a citation
matches the *retrieved source* — it does **not** know whether the source itself is accurate. BNS is
now authoritative; the remaining acts and the BNSS classification join are the next data tasks.

KYR is **educational** and is not a substitute for a qualified lawyer. Every report ends with
that disclaimer.

---

## What's built vs. pending

**Built + verified end-to-end:**
- 4-call agent pipeline (analyze → retrieve → advise → **verify: grounding + relevance**) with confidence gate
- Pluggable RAG: local transformers.js embeddings + local file vector store (default, zero-infra) — or Voyage/Gemini + Qdrant
- Pluggable LLM: Gemini (OpenAI-compat, default) or Anthropic Claude
- `/api/analyze` (zod-validated) + dark Next.js UI (landing + analyzer + 14-section report)
- **Full real corpus**: 6 codes, 1561 sections; BNS fully classified (punishment + cognizable/bailable/court + compoundable), all validated
- **Persistence**: incidents + citations saved (SQLite dev / Postgres prod) via repository pattern
- **Auth**: Clerk sign-in/up + header control (gated — activates when keys set)
- **Multimodal**: PDF / image / text upload — local OCR (tesseract.js) + PDF text extraction, no API/quota (`/api/extract`); user reviews extracted text before analysis. Plus **voice input** (browser Web Speech, language-aware).
- **Rate limiting**: in-memory sliding window on `/api/analyze` (12/min) + `/api/extract` (20/min), per IP (Redis-upgradeable) — verified 20×200 then 429
- **History**: `/history` lists saved analyses (Clerk-user-scoped when signed in)
- **Tests**: Vitest (17 unit tests on grounding-critical parsers, chunker, schemas) — `npm run test`
- **Deploy**: self-contained `Dockerfile` + [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) (Docker/Node host or Vercel+managed); production build verified

**Pending (nice-to-have / out of free-local scope):**
- Audio transcription (needs an external STT service)
- Multi-turn follow-up chat (schema supports it; analyzer is single-shot today)
- Stronger retrieval (BGE-base 768d when the model download succeeds; or a legal-domain embedder)

See the phase roadmap in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#12-phased-roadmap-per-prompt).

---

## Environment variables

See [`.env.example`](.env.example). Required for the analyze pipeline:
`ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `QDRANT_URL`.
