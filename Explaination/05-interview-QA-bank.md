# Interview Q&A Bank

Organized by category. Each answer is grounded in the actual codebase — see file 6 for exact
references if you want to pull up code live.

---

## A. Project overview / "tell me about a project"

**Q: What does this project do, in one sentence?**
A: It's an AI legal-incident analyzer for Indian citizens — describe an incident in any Indian
language and get back the applicable laws and a concrete action plan, with every legal citation
independently verified against real government statute text before it's shown.

**Q: What was the hardest technical problem?**
A: Preventing hallucination in a domain where a wrong answer has real consequences. The solution
is a two-axis adversarial verification step (grounding + relevance) that runs as a completely
separate model call with a fresh context, and the orchestrator hard-drops any citation that fails
either check — see `02-architecture-and-rag-deep-dive.md`.

**Q: Who is the user and what do they actually need?**
A: Someone in a real, often first-time legal situation — unpaid wages, an online scam, a landlord
dispute — who needs two things fast: confirmation that what happened to them is actually covered
by law, and a clear next step. Not a legal researcher; someone who wants clarity under stress.

**Q: What's the current state — is it finished, an MVP, a prototype?**
A: The backend pipeline is verified end-to-end (real corpus, real retrieval, real LLM calls,
adversarial verification). The frontend went through a full 12-phase premium redesign with
accessibility/performance/QA passes. It's deployed and live. Known gaps are explicitly tracked
(see section E) rather than hidden.

**Q: How long did this take / how did you approach building it?**
A: Backend first, in an explicitly phased build with approval gates after each phase (architecture
→ corpus → retrieval → generation → verification → persistence → auth → multimodal → rate
limiting → tests → deploy), then a separate 12-phase frontend redesign under a strict
"never touch backend logic" constraint. Phasing with checkpoints kept a large scope reviewable.

**Q: What would you demo in 2 minutes?**
A: `/chat` → type an incident → watch the staged pipeline UI → the resulting report with
per-citation verification badges → Print/PDF export. That flow exercises the analyzer, RAG,
verification, report UI, and export feature in one pass.

---

## B. RAG / LLM systems (the technical core — expect the most follow-ups here)

**Q: Walk me through what happens when a user submits an incident.**
A: Walk the pipeline diagram in file 2: Agent 1 extracts structured facts + retrieval queries →
Agent 2 embeds those queries and hybrid-searches the vector index → Agent 3 drafts a report
constrained to only cite retrieved sections → Agent 4 independently re-verifies every citation for
grounding and relevance → the orchestrator filters to only citations that pass both checks.

**Q: How do you prevent hallucination?**
A: Two layers. First, the drafting prompt is explicitly instructed to only cite sections it was
given in the retrieved context (grounding by instruction — necessary but not sufficient, since
LLMs don't perfectly follow instructions). Second, and more importantly, a **separate model call**
with a fresh context re-checks every citation from scratch against the same retrieved chunks —
this catches cases where the drafting model ignored the instruction, because the verifier isn't
anchored on the drafter's reasoning at all.

**Q: What's the difference between "grounded" and "relevant"? Why do you need both?**
A: Grounded means the section literally exists in what was retrieved — it stops the model
inventing a section number. Relevant means the incident's actual facts satisfy that section's
legal elements — it stops the model correctly citing a real section that doesn't actually apply.
A real example from development: BNS §111/112 (organised crime) got cited for an ordinary online
scam because the section text mentions "fraud" — it's grounded (the section is real and was
retrieved) but not relevant (the facts don't show a continuing criminal syndicate). Grounding
alone wouldn't have caught that; the relevance check did.

**Q: How is "hybrid search" implemented? Is it BM25 + dense?**
A: No — it's dense cosine similarity plus a targeted keyword leg. The keyword leg regex-parses the
raw query for an explicit section/article number (e.g. "Section 420") and, if found, force-
includes any chunk with that exact section number at a fixed high score. This isn't full BM25; the
insight is narrower — dense embeddings are good at semantic meaning but weak at exact numeric
identifiers, so a small deterministic rule handles the "user typed the exact section they mean"
case that embeddings alone underserve.

**Q: How do you decide the system isn't confident enough to answer?**
A: Two independent confidence signals feed a combined flag. Retrieval confidence: the top cosine
score across all retrieval queries must clear an empirically calibrated threshold (0.5, tuned for
the current embedding model's score distribution). Verification confidence: the verifier's own
`overallConfident` judgment. `confident = retrieval.confident && verification.overallConfident` —
both need to agree; a low score on either shows an explicit "not sufficiently confident" banner in
the UI rather than presenting a shaky report as fact.

**Q: Why not just increase k (retrieve more chunks) to be safer?**
A: More chunks means more context for the drafter to potentially cite from incorrectly, and more
noise for the embedding-based ranking to sort through. `k=8` per query (doubled when merging
multiple retrieval queries) was a pragmatic default, not derived from a formal sweep — a fair
thing to say if pressed, along with "the real backstop against over-citation isn't retrieval
breadth, it's the verifier."

**Q: How would you evaluate this system's accuracy?**
A: Two layers exist today: (1) a validated ground-truth sample
(`data/corpus/derived/validation-sample.json`) checks the *corpus's own metadata* (cognizable/
bailable/compoundable classifications) against independently researched sources — 15/15 and 14/14
matches respectively; (2) `npm run test:retrieve` checks that known-relevant queries surface the
correct sections at rank #1, without spending any LLM quota. What's *not* built yet: a held-out
eval set of (incident → expected verified-law-set) pairs to measure end-to-end pipeline precision/
recall. That's the honest answer if asked "how do you know it's actually accurate."

**Q: Why chunk at 1,600 chars with 200 overlap?**
A: To keep most single legal sections in one chunk (avoiding mid-section splits that would sever a
legal element from its context), while overlap prevents a hard cut from orphaning a clause. Not
derived from a formal ablation — a reasonable default for statute-length text, worth naming as an
area you'd tune with real eval data if you had it.

**Q: How does structured output work across two different LLM providers?**
A: Same Zod schema drives both paths, but the mechanism differs. Anthropic's SDK has a native
structured-output helper (`messages.parse` + `zodOutputFormat`) that returns a `parsed_output`
field. Gemini doesn't have SDK-level structured output for this integration, so it's called via
raw `fetch` against its OpenAI-compatible endpoint with `response_format: { type: "json_schema" }`
— and critically, the raw JSON reply is **still run through the same Zod schema's `.parse()`**
before being trusted, so a malformed or off-schema Gemini reply throws instead of silently
corrupting the report.

**Q: What happens if the LLM call fails or times out?**
A: `/api/analyze` wraps `runAnalysis()` in a try/catch; any failure returns a generic 500
("Analysis failed. Please try again.") rather than leaking a raw error to the user, and logs the
failure with timing info. The embedding layer has its own retry/backoff for transient network
errors and 429s (up to 6 attempts, exponential-ish backoff) before giving up.

**Q: Is retrieval synchronous per query or parallelized?**
A: `retrieveMany` fires `Promise.all` across all of Agent 1's retrieval queries (typically 3–6)
simultaneously, then merges results by chunk id keeping the highest score per chunk — not
sequential.

**Q: Why keep chunk ids deterministic (hash-based) instead of random UUIDs?**
A: So re-running ingestion is idempotent — updating a chunk's text re-embeds and overwrites the
same id instead of creating a duplicate. This matters because corpus scrapers are re-run whenever
source data changes, and you don't want the vector index silently accumulating stale duplicate
entries every time.

---

## C. System design / scaling

**Q: This uses an in-memory JSON file as a vector store. How would that break at scale, and how
would you fix it?**
A: It breaks in two ways: brute-force cosine search is O(n) per query (fine at 2,801 vectors,
not fine at millions), and a flat file has no real durability/concurrency story for multiple
writers. The fix is already designed for, not hypothetical: `store.ts` is a thin dispatcher behind
`VECTOR_STORE=local|qdrant` — swapping to Qdrant (already implemented in `qdrant.ts`) for
production scale is an env-var change, because no calling code imports a concrete backend
directly.

**Q: The rate limiter is in-memory. What breaks in a multi-instance deployment?**
A: Each process has its own counters, so a user's requests could be split across instances and
each instance would independently think the user hasn't hit the limit — effectively multiplying
the real limit by the instance count. Named as an explicit, undisguised tradeoff: `ioredis` is
already a dependency specifically so this can move to Redis-backed counters without changing any
call site (`rateLimit(key, limit, windowMs)` signature stays the same).

**Q: How would you add horizontal scaling to this app?**
A: Three things need to move off single-process state: the rate limiter (→ Redis), the vector
store (→ Qdrant, already built), and the database (→ managed Postgres, already the documented
production path in `docs/DEPLOYMENT.md`). The Next.js app itself is stateless per-request once
those three move, so it scales horizontally without further changes.

**Q: Why SQLite instead of Postgres from day one?**
A: Zero setup cost during development — matches the project's "runs immediately, no infra"
philosophy. The Prisma schema keeps the Postgres-specific types as comments precisely so switching
back is a known, mechanical migration, not a redesign — a deliberate "cheap now, cheap to fix
later" tradeoff rather than premature production-readiness.

**Q: What's your incident-persistence failure mode?**
A: Best-effort, non-blocking. `persist()` in the `/api/analyze` route is wrapped in try/catch and
only logs on failure — a database outage degrades to "the user gets their legal analysis but it
isn't saved to history," never "the user's request fails because the database is down." That
priority ordering (core feature > persistence) was a deliberate choice.

**Q: How do you handle a user uploading a huge or malicious file?**
A: `/api/extract` enforces a size guard (10MB) and a type guard before processing, and OCR/PDF
extraction happens locally (tesseract.js / a PDF parser) — no file content is sent to a third-party
API, which also sidesteps a class of "sensitive document sent to an external vision API" concerns.

---

## D. Frontend

**Q: Walk me through the frontend redesign approach.**
A: 12 explicit phases (see file 4) under one hard rule: never touch backend logic, only
presentation. Each phase ended with an independent adversarial code-review pass before moving on,
specifically checking that rule held — verified clean twice.

**Q: How did you handle accessibility?**
A: Systematically audited, not sprinkled in: skip-to-content link, a real `<main>` landmark,
ARIA labels on every icon-only control, `role="alert"` on error states, and — the most concrete
example — the mobile navigation drawer was originally hand-rolled with `aria-modal="true"` but no
actual focus trap or focus restoration, which is a real WCAG/WAI-ARIA anti-pattern (the ARIA
attribute promises modal behavior the DOM didn't deliver). It was caught by an adversarial review
and replaced with Radix's Dialog primitive, which provides focus trap, focus restore, and an
inert background for free.

**Q: How did you improve performance, and what was the actual measured impact?**
A: Code-splitting anything not needed on first paint: the report view (and its framer-motion
dependency) loads only once an analysis exists; the command palette loads only on first ⌘K press;
and — the biggest win — *all* Clerk authentication client code is behind a dynamic import gated on
whether auth is actually configured, so when Clerk is disabled (the current deployment), none of
its JS ships at all. Measured result: First Load JS dropped 24–35% across the main routes without
touching any backend code.

**Q: How do you keep animations from breaking the printed PDF?**
A: The report uses framer-motion mount-stagger animations (gated behind `useReducedMotion` already
for accessibility), but printing triggers `window.print()` synchronously — if an element were
still mid-fade-in, it could theoretically print at partial opacity. The print stylesheet forces
`opacity: 1 !important; transform: none !important` on every element inside the report root, so
the printed output is always the fully-settled state regardless of animation timing.

**Q: Why Radix UI instead of building dialogs/dropdowns from scratch?**
A: Correctness that's easy to get wrong by hand — focus trapping, ARIA semantics, escape-to-close,
click-outside — is exactly what a hand-rolled drawer got wrong in this project (see the a11y
answer above). Radix provides that correctness as a primitive so you style it instead of
reinventing it, and the bug that motivated switching to it is a concrete, honest story to tell.

---

## E. Honest limitations / "what would you improve" (never dodge these)

**Q: What's the biggest limitation of the current system?**
A: The embedding model is general-purpose (`bge-small-en-v1.5`), not legal-domain — a model like
`voyage-law-2` (which the system already supports as a pluggable option) would likely improve
retrieval precision on legal terminology, but its free tier couldn't handle bulk-embedding the
corpus during development. This is a known, named tradeoff, not an oversight.

**Q: What's missing that you'd build next?**
A: An actual held-out evaluation set (incident → expected verified laws) to measure end-to-end
precision/recall — right now correctness is validated at the corpus-metadata level and the
retrieval level, not the full pipeline level. Also: multi-turn follow-up conversation (the data
model already supports it; the analyzer is single-shot by product choice today), and audio
transcription for voice input beyond the browser's built-in Web Speech API.

**Q: Is the legal corpus actually reliable?**
A: The corpus is scraped **verbatim** from official government sources (indiacode.nic.in, NCRB)
with every scraper asserting the expected section count — a blocked or partial scrape fails loudly
rather than silently shipping a truncated corpus. But the verifier only confirms a citation
matches *what was retrieved*, not that the source itself is free of transcription error or that
the law hasn't been amended since scraping. That distinction — "internally consistent" vs.
"externally guaranteed correct" — is the honest answer, and the app states this limitation to
users via its disclaimer.

**Q: What happens if two sections conflict or a law has been repealed?**
A: Not explicitly handled today. The corpus reflects the current BNS/BNSS/BSA codes (which
replaced the IPC/CrPC/Evidence Act in 2023) at time of scraping — there's no mechanism to detect
or flag a subsequent amendment. This would need either periodic re-scraping with diffing, or a
"last verified" timestamp surfaced to the user (the corpus does track `lastAmended` per act
already, just not enforced against staleness).

**Q: If this had to serve millions of users tomorrow, what breaks first?**
A: In order: the in-memory rate limiter (breaks correctness across instances before it breaks
performance), then the local file vector store (O(n) search doesn't scale, and a shared file isn't
safe for concurrent writes), then SQLite persistence. All three have a documented swap-path
already built (Redis / Qdrant / Postgres) — none require rearchitecting the application code.

---

## F. Behavioral (project-flavored)

**Q: Tell me about a decision you reconsidered.**
A: The embedding model. It started on a general MiniLM model, then moved to `bge-small-en-v1.5`
after observing weak score separation between relevant and irrelevant queries — the switch
required also recalibrating the confidence threshold (0.4 → 0.5) because the two models' score
distributions aren't comparable. Good example of "I changed the model AND re-validated every
downstream assumption that depended on its output range," not just swapping and hoping.

**Q: Tell me about a bug you found and fixed.**
A: Two solid ones on hand: (1) a placeholder Clerk key (`pk_test_xxxxxxxx` from `.env.example`)
being truthy enough to make the app think auth was configured, causing every route to 500 —
fixed by requiring the key to actually look like a real key (`startsWith("pk_") &&
!includes("xxxx")`); (2) the Docker deployment failing because the Dockerfile copied a `public/`
directory that never existed in the repo — fixed by adding an empty one, after reading the exact
build-daemon error rather than guessing at the cause.

**Q: How do you decide when something is "done"?**
A: Explicit phase gates with a checklist, not vibes — each phase (in both backend and frontend
work) ended with a concrete verification step (tests passing, typecheck clean, a production build
succeeding, or in the frontend's case, an independent adversarial review) before moving to the
next phase. "Done" means the verification step passed, not "it looked right."

**Q: Why did you build this specific project?**
A: (Answer this one in your own words — it's the one question this file can't answer for you
honestly. Anchor it in the real problem from file 1: access to legal knowledge is unevenly
distributed, and the people who need it most are the least equipped to navigate dense legal text.)
