# Tech Stack & Tradeoffs

For every choice: what it is, why it was picked, and the tradeoff accepted knowingly. Interviewers
respond much better to "I chose X, knowing it costs me Y, because Z mattered more right now" than
to a list of buzzwords.

## LLM layer

**Gemini 2.5 Flash (default, via OpenAI-compatible endpoint)** with **Anthropic Claude
(Opus for reasoning / Haiku for extraction) as a pluggable alternative**, selected by
`LLM_PROVIDER` in `.env`.

- *Why Gemini as the live default*: free tier is generous enough to actually demo and use the
  product without a paid key — critical for a "should be free for everyone" product.
- *Why structured output either way*: both paths return **schema-validated JSON**, not free text
  parsed with regex. Anthropic uses its native `messages.parse` + `zodOutputFormat` helper; Gemini
  (no native structured-output SDK support at integration time) is called via raw `fetch` against
  its OpenAI-compatible endpoint with `response_format: json_schema`, and the reply is **still**
  validated against the same Zod schema before use (`opts.schema.parse(obj)`) — so a malformed
  Gemini reply throws instead of silently propagating bad data.
- *Tradeoff accepted*: Gemini's free tier is rate-limited (~20 requests/day observed), which
  blocked continuous live pipeline testing during development. Mitigation: build most retrieval
  and corpus verification against `npm run test:retrieve`, which never calls the LLM at all.

## Embeddings

**transformers.js running `bge-small-en-v1.5` locally (default)**, pluggable to Voyage
(`voyage-law-2`, a *legal-domain* embedding model) or Gemini embeddings via `EMBED_PROVIDER`.

- *Why local is the default, not the legal-domain model*: Voyage's free tier (3 requests/min, 10K
  tokens/min) is far too low to embed a 2,055-section corpus in reasonable time, and Gemini's
  embedding quota was exhausted during development. Local embeddings are **zero-quota and
  offline** — the entire corpus embeds once at build time with no external dependency at all.
- *Tradeoff accepted*: `bge-small-en-v1.5` is a general-purpose embedding model, not legal-domain
  like `voyage-law-2`. This is explicitly logged as a known limitation (see
  `Explaination/05-interview-QA-bank.md` → "what would you improve"). It was mitigated, not
  solved, by empirically recalibrating the confidence threshold after switching models (MiniLM →
  BGE moved relevant-query scores from ~0.27–0.61 up to ~0.57–0.73) and by leaning on the
  verifier's relevance check as a second line of defense.

## Vector store

**A local JSON file + brute-force cosine search (default)**, pluggable to **Qdrant** via
`VECTOR_STORE`.

- *Why local by default*: zero infrastructure — no Docker, no hosted DB, works on any machine
  immediately. Fine for 2,801 vectors; brute-force cosine over that size is milliseconds.
- *Tradeoff accepted*: this doesn't scale — brute-force search is O(n) per query and an in-memory
  JSON file has no real durability/replication story. That's precisely why the interface
  (`store.ts`) is provider-agnostic: swapping to Qdrant for production scale is an env-var change,
  not a rewrite.

## Persistence

**Prisma ORM, SQLite in dev / Postgres in production** (schema keeps enums as comments so
switching providers back is a documented, mechanical change, not a redesign).

- *Why SQLite for dev*: zero setup, file-based, matches the "runs with nothing installed" goal of
  the whole project.
- *Tradeoff accepted*: SQLite in a Docker container is ephemeral — incident history doesn't
  survive a redeploy unless a volume is mounted or the DB is swapped to managed Postgres. This is
  documented plainly in `docs/DEPLOYMENT.md`, not hidden. Persistence itself is also
  **best-effort**: `/api/analyze` calls `persist()` in a try/catch that only logs on failure — a
  DB outage should never break the actual legal analysis the user is waiting for.

## Auth

**Clerk, fully optional.** `clerkEnabled` is computed by checking the publishable key actually
looks real (`startsWith("pk_") && !includes("xxxx")`) rather than just "is the env var set" — this
was a real bug caught during development: the `.env.example` placeholder key was truthy enough to
make every route 500 before this check existed.

- *Why optional, not required*: the target user shouldn't need an account to get help in a legal
  emergency. Every route works signed-out; auth only adds cross-device history.

## Frontend framework

**Next.js 15 App Router + React 19 + TypeScript (strict) + Tailwind CSS.**

- *Why App Router*: server components by default keep the initial bundle small, and API routes
  (`/api/analyze`, `/api/extract`) live in the same codebase as the UI — no separate backend
  service needed for a project this size.
- *Why strict TypeScript*: the entire pipeline is schema-driven (Zod end to end — request
  validation, LLM structured output, API response shape) and TS strict mode is what makes that
  actually load-bearing instead of decorative.

## Multimodal input

**tesseract.js (local OCR) + a PDF text extractor for uploads, browser Web Speech API for voice.**

- *Why local OCR instead of a cloud vision API*: same "free forever" constraint — no per-image API
  cost, no quota to exhaust, works offline once the WASM model is cached.
- *Tradeoff accepted*: local OCR is slower and less accurate than a commercial cloud OCR API on
  messy handwriting/low-quality photos. Mitigated by product design, not model choice: extracted
  text is shown to the user **before** analysis so they can correct OCR mistakes rather than
  silently feeding garbage into the legal pipeline.

## Rate limiting

**In-memory sliding window, per-process**, explicitly designed to be Redis-swappable (the
dependency, `ioredis`, is already installed) without changing call sites.

- *Tradeoff accepted, stated openly*: this doesn't work correctly across multiple server
  instances (each process has its own counters) — fine for a single Node host, not fine for
  horizontally-scaled serverless. This is exactly the kind of tradeoff you should be ready to name
  unprompted in an interview; it signals you understand the limits of what you built, not just
  what it does when it works.

## Testing

**Vitest, 17 unit tests**, deliberately scoped to the **grounding-critical parsers** — the BNSS
classification scraper's cognizable/bailable normalization and the compounding-section-number
extractor — not the whole app.

- *Why these specific tests and not, say, component tests*: a bug in a legal-classification parser
  produces silently wrong legal facts shown to a real user. A bug in a button's hover state does
  not. Test investment followed risk, not coverage-percentage vanity metrics.

## Deployment

**Self-contained multi-stage Docker image** (build stage runs `prisma generate`, `db push`, the
full local-embedding ingest, and `next build`; the runtime stage only needs a Gemini/Anthropic
key) — deployed to **Railway**.

- *Why bake the vector index into the image at build time* instead of embedding at runtime: it
  means the runtime container starts instantly with a warm, complete index and needs zero API
  keys beyond the LLM — consistent with the "only the LLM call touches the network" design goal
  stated everywhere else in the stack.
- *Alternative path documented, not built*: `docs/DEPLOYMENT.md` also describes a Vercel path
  (managed Qdrant + API embeddings + managed Postgres) for anyone who needs serverless — since
  Vercel functions can't run the native local-embedding runtime (`@huggingface/transformers`
  needs a real Node process, not an edge/serverless sandbox).
