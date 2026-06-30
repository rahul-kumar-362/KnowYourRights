<div align="center">

<img src="https://raw.githubusercontent.com/rahul-kumar-362/KnowYourRights/main/src/app/icon.svg" width="72" height="72" alt="KnowYourRights logo" />

# KnowYourRights <sub>KYR</sub>

### Describe what happened. Know the law. Know what to do.

KYR is an AI legal-incident analyzer for Indian citizens. Describe an incident in **any Indian
language** — typed, spoken, or photographed — and get back the laws that actually apply, with
every citation checked against official source text before it's shown to you.

[**🌐 Live Demo**](https://knowyourrights-production-b0ce.up.railway.app) · [Architecture](docs/ARCHITECTURE.md) · [Deployment](docs/DEPLOYMENT.md) · [Folder Structure](docs/FOLDER_STRUCTURE.md)

[![Live](https://img.shields.io/badge/demo-live-22c55e?style=flat-square)](https://knowyourrights-production-b0ce.up.railway.app)
![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Tests](https://img.shields.io/badge/tests-17%20passing-22c55e?style=flat-square)
![Legal codes](https://img.shields.io/badge/legal_codes-12-6366F1?style=flat-square)
![Sections](https://img.shields.io/badge/sections-2%2C055-6366F1?style=flat-square)

</div>

<br/>

> Most people don't act on a wrong because they don't know their rights. Legal text is dense,
> scattered across codes, and intimidating. KYR closes that gap — for free.

## Why KYR

| | |
|---|---|
| 🔍 **Source-grounded, not guessed** | Every cited section comes only from retrieved official statute text — never the model's memory. Unsupported citations are dropped before you see them. |
| 🛡️ **Independently verified** | A separate adversarial pass checks each citation twice: does the section actually exist in the source (**grounding**), and do the stated facts satisfy its legal elements (**relevance**)? Only citations that pass both survive. |
| 🗣️ **Any Indian language** | Type, speak, or upload a photo of an FIR/notice — in English, Hindi, Hinglish, or any of 11+ Indian languages. |
| ⚖️ **Full offence detail** | Punishment, bailable/cognizable/compoundable status, and the trying court — sourced from the official BNSS First Schedule and §359, not inferred. |
| 📋 **An actual action plan** | Not just "the law" — concrete next steps, documents to gather, evidence to preserve, authorities to contact, and what happens next. |
| 🆓 **Free & offline-capable** | Local embeddings + local vector store + SQLite by default. Only the LLM call touches the network — and that has a free tier too. |
| 🏗️ **Honest about limits** | When confidence is low, KYR says so out loud, and every report ends with a clear "this isn't a lawyer" disclaimer. |

---

## How it works

```
                         ┌─────────────────────────────┐
   incident text  ─────▶ │  1. Incident Analyzer        │   extracts entities, timeline,
   (any language)        │     (structured extraction)  │   legal issues, retrieval queries
                         └──────────────┬───────────────┘
                                        ▼
                         ┌─────────────────────────────┐
                         │  2. Law Retriever             │   embeds queries, hybrid-searches
                         │     (RAG over 2,055 sections) │   2,801 chunks across 12 codes
                         └──────────────┬───────────────┘
                                        ▼
                         ┌─────────────────────────────┐
                         │  3. Advisor                   │   drafts the 14-section report —
                         │     (grounded generation)      │   never cites a section it didn't retrieve
                         └──────────────┬───────────────┘
                                        ▼
                         ┌─────────────────────────────┐
                         │  4. Verifier (adversarial)    │   re-checks every citation for
                         │     grounding + relevance      │   grounding AND fit to the facts
                         └──────────────┬───────────────┘
                                        ▼
                           ✅ verified report only
```

Full design rationale: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Codebase layout:
[`docs/FOLDER_STRUCTURE.md`](docs/FOLDER_STRUCTURE.md).

---

## Tech stack

<table>
<tr><td><b>Frontend</b></td><td>Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS · Radix UI · framer-motion · next-themes</td></tr>
<tr><td><b>AI / LLM</b></td><td>Gemini 2.5 Flash (free tier, default) <i>or</i> Anthropic Claude — pluggable via <code>LLM_PROVIDER</code></td></tr>
<tr><td><b>Embeddings</b></td><td>BGE-small-en-v1.5 via transformers.js, fully local/offline (default) <i>or</i> Voyage / Gemini embeddings — pluggable via <code>EMBED_PROVIDER</code></td></tr>
<tr><td><b>Vector store</b></td><td>Local file store, zero-infra (default) <i>or</i> Qdrant — pluggable via <code>VECTOR_STORE</code></td></tr>
<tr><td><b>Persistence</b></td><td>Prisma ORM · SQLite (dev) / PostgreSQL (prod)</td></tr>
<tr><td><b>Auth</b></td><td>Clerk (optional — app is fully usable without it)</td></tr>
<tr><td><b>Multimodal</b></td><td>tesseract.js OCR + PDF text extraction (local, no quota) · browser Web Speech voice input</td></tr>
<tr><td><b>Testing</b></td><td>Vitest — 17 unit tests on grounding-critical parsers</td></tr>
<tr><td><b>Deploy</b></td><td>Self-contained Docker image · live on Railway</td></tr>
</table>

---

## Quick start

Runs **fully free and offline-capable** by default — local embeddings, local vector store, no
Docker or Qdrant required. Only the LLM call needs network, and Gemini's free tier covers it.

```bash
# 1. Install
npm install
cp .env.example .env        # fill in GEMINI_API_KEY (free: aistudio.google.com/apikey)

# 2. Build the legal corpus (scrapes verbatim official text — no hand-authored statutes)
npm run build:bns && npm run build:bnss-schedule && npm run build:compounding
npm run build:corpus -- bnss && npm run build:corpus -- bsa
npm run build:corpus -- itact && npm run build:corpus -- wages
npm run build:constitution
npm run build:corpus -- consumer && npm run build:corpus -- rti
npm run build:corpus -- pocso && npm run build:corpus -- dv
npm run build:corpus -- mv && npm run build:corpus -- rera

# 3. Embed the corpus (local, resumable, no API key needed)
npm run ingest

# 4. Run
npm run dev                  # → http://localhost:3000
```

Sanity-check the pipeline from the CLI without a browser:
```bash
npm run test:analyze -- "My employer hasn't paid my salary for 3 months"
npm run test:retrieve        # retrieval-only, no LLM call, no quota burned
npm run test                 # 17 unit tests
```

Want it running with one command? See the self-contained [`Dockerfile`](Dockerfile) — it bakes
in the corpus, builds the local vector index at build time, and needs only a Gemini key at
runtime. Full guide: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## What's verified, end-to-end

- **4-call agent pipeline** (analyze → retrieve → advise → verify) with a confidence gate on low-grounding incidents
- **Full real legal corpus** — 2,055 sections/articles across 12 official Indian codes, scraped verbatim from government sources, count-asserted (a blocked scrape fails loudly, never falls back to a truncated corpus)
- **BNS fully classified**: punishment, cognizable/bailable/trying-court (from the official NCRB BNSS First Schedule), and compoundable status (from BNSS §359) — validated against an independent ground-truth sample
- **Pluggable everything**: swap LLM, embedding provider, and vector store independently via env vars — same code path, zero lock-in
- **Multimodal intake**: PDF/image/text upload with local OCR, plus language-aware voice input
- **Persistence + history**: incidents and citations saved, user-scoped when Clerk auth is enabled
- **Rate limiting**: sliding window per IP on both API routes
- **Premium, accessible UI**: full design system, responsive, keyboard/screen-reader accessible, animated, code-split — audited by independent review passes for backend-isolation and reduced-motion compliance

| Legal source | Sections | Provenance |
|---|---|---|
| BNS — Bharatiya Nyaya Sanhita | 358 | Verbatim, indiacode.nic.in · classification from NCRB BNSS First Schedule + §359 |
| BNSS — Bharatiya Nagarik Suraksha Sanhita | 531 | Verbatim, indiacode.nic.in |
| BSA — Bharatiya Sakshya Adhiniyam | 170 | Verbatim, indiacode.nic.in |
| Constitution of India | 308 | Official Legislative Dept. PDF (article bodies) |
| IT Act, 2000 | 125 | Verbatim, indiacode.nic.in |
| Code on Wages, 2019 | 69 | Verbatim, indiacode.nic.in |
| Consumer Protection Act, 2019 | 107 | Verbatim, indiacode.nic.in |
| Motor Vehicles Act, 1988 | 180 | Verbatim, indiacode.nic.in |
| POCSO Act, 2012 | 47 | Verbatim, indiacode.nic.in |
| Domestic Violence Act, 2005 | 37 | Verbatim, indiacode.nic.in |
| RERA, 2016 | 92 | Verbatim, indiacode.nic.in |
| RTI Act, 2005 | 31 | Verbatim, indiacode.nic.in |
| **Total** | **2,055** | embedded as 2,801 vector chunks |

**The grounding system is only as correct as the corpus.** The verifier confirms a citation
matches the *retrieved source* — it cannot independently confirm the source itself is
error-free. Treat this as a strong floor, not a legal guarantee.

---

## Pending / out of free-local scope

- Audio transcription (would need an external paid STT service)
- Multi-turn follow-up chat (schema already supports it; the analyzer is single-shot today)
- A legal-domain embedding model (currently general-purpose BGE-small)

Full phased roadmap: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#12-phased-roadmap-per-prompt).

---

## Disclaimer

KYR is an **educational tool**. It explains which laws may apply to a described situation and
what people typically do next — it is **not legal advice** and is not a substitute for a
qualified lawyer. Every report ends with this disclaimer, and KYR will tell you plainly when its
confidence in a citation is low.

