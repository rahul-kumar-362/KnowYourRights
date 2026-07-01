# Project Overview & Pitch

## The 30-second pitch

> "KnowYourRights is an AI legal-incident analyzer for Indian citizens. You describe what
> happened to you — in any Indian language, typed, spoken, or as a photo of a document — and it
> tells you exactly which laws apply, what your rights are, and what to do next. The key
> engineering problem is that it's a **legal** product, so it can't hallucinate a law that doesn't
> exist. I built a RAG pipeline with an independent adversarial verifier that checks every single
> citation against real government statute text before it's ever shown to the user — and drops
> anything it can't back up."

## The problem

Most people don't act on a wrong done to them because they don't know their rights. Indian law is
spread across dozens of codes (BNS, BNSS, BSA, the Constitution, IT Act, sector-specific acts...),
written in dense legalese, and inaccessible to someone who just got scammed or locked out of their
flat. The gap isn't "the law doesn't help them" — it's "they don't know the law exists or how to
invoke it."

## The user

Someone in a stressful, often first-time legal situation — unpaid salary, an online scam, a
landlord dispute, harassment — who wants two things fast: **"is this actually illegal?"** and
**"what do I do right now?"** They are not a lawyer and don't want to become one; they want a
clear, honest, actionable answer.

## Why this is a *hard* AI product (not just "wrap an LLM")

This is the part worth emphasizing in an interview — it's what separates this project from a
weekend ChatGPT wrapper:

1. **Fabrication is unacceptable.** A generic chatbot can hallucinate a plausible-sounding law and
   nobody notices. Here, a fabricated section number could send someone to file the wrong
   complaint, or give them false confidence about a right that doesn't exist. So the system is
   built around **grounding**: nothing is stated unless it was retrieved from real, scraped,
   verbatim government text — and even then, a second adversarial model pass has to independently
   confirm it.
2. **"Grounded" isn't enough — it has to be *relevant too.*** An LLM can retrieve a real section
   and still misapply it (cite organised-crime provisions for a single scam, because the section
   text happens to mention "fraud"). The verifier checks two separate things for every citation:
   does this section **exist** in the source (grounding), and do the **stated facts actually
   satisfy its legal elements** (relevance). Both must pass.
3. **It has to work for free, for everyone.** The target user is not going to pay for legal help —
   that's the whole reason they need this. So every layer (embeddings, vector search, database)
   has a fully local/free-tier path, and only the final LLM call needs any paid-adjacent service
   (and even that has a generous free tier).
4. **Any Indian language.** The input pipeline handles typed text, voice (browser Web Speech, one
   of 11+ Indian languages), and photographed documents (local OCR) — because the people who most
   need this often aren't typing fluent English legalese.

## The 2-minute pitch (technical audience)

> "It's a 4-stage agent pipeline. Stage 1 extracts a structured incident (entities, timeline,
> legal issues, and retrieval queries) from the raw text. Stage 2 embeds those queries and does a
> hybrid dense + keyword search over a local vector index of 2,055 real statute sections across 12
> Indian legal codes — I scraped all of it verbatim from indiacode.nic.in and the NCRB, nothing is
> hand-authored. Stage 3 drafts a 14-section report, told explicitly it may only cite sections it
> was handed. Stage 4 is the interesting part: a completely separate model call re-reads every
> cited law against the same retrieved chunks and independently scores it on two axes — grounding
> and relevance — and the orchestrator throws out anything that fails either check before the user
> ever sees it. The whole thing runs on a pluggable LLM/embedding/vector-store layer, so the
> default deployment is Gemini's free tier + local embeddings + a local file-based vector store —
> genuinely free to run, no Docker or hosted vector DB required for the default config."

## The 5-minute pitch (add these if there's time / they're engaged)

- **Frontend**: a from-scratch premium redesign done in 12 explicit phases (design system → app
  shell → landing → analyzer UX → report UI → responsive → accessibility → motion → performance),
  each one verified by an independent adversarial code-review pass before moving on, with a hard
  rule that presentation work could never touch backend logic.
- **Corpus integrity**: every scraper count-asserts against the expected number of sections — a
  blocked or partial scrape *fails loudly* rather than silently writing a truncated corpus. This
  matters because a silent gap in the corpus is a silent gap in what the app can ground citations
  against.
- **Deployed and live**: Docker image self-contained (bakes in the corpus + builds the local
  vector index at build time), deployed to Railway, reachable at a public URL today.
- **Honesty by design**: when retrieval confidence is low, the UI says so explicitly and tells the
  user to treat the answer as general information, not a grounded citation. This isn't a fallback
  bolted on afterward — it's threaded through the schema (`confident`, `retrievalTopScore`) from
  the orchestrator all the way to the report banner.

## If they ask "what would you demo?"

Walk `/chat` → type an incident ("my employer hasn't paid my salary for three months") → the
staged pipeline UI (reading → retrieving → drafting → verifying) → the resulting report with the
verified-citation badges on each law row → hit Print/PDF to show the exportable version. That
single flow touches almost every subsystem in the project.
