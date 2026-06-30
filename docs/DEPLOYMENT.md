# Deployment (Phase 10)

KYR has a **local-first** default (transformers.js embeddings, file vector store, SQLite) and a
**managed** production option (API embeddings, Qdrant, Postgres). Pick by host.

---

## Path A — Docker / Node host (recommended; keeps the local stack)

Runs on any Node host that allows native modules: **Railway, Render, Fly.io, a VM, or local Docker**.
The image bundles the corpus, a locally-built vector index, and the embedding model, so the only
runtime secret is an LLM key.

```bash
docker build -t kyr .
docker run -p 3000:3000 -e GEMINI_API_KEY=AIza... kyr
# → http://localhost:3000
```

What the build does: `prisma generate` + `db push` (SQLite), `npm run ingest` (builds
`data/index/vectors.json` with local embeddings — no keys needed), `next build`.

Runtime env (override on the host):
| Var | Default | Note |
|---|---|---|
| `GEMINI_API_KEY` | — | **required** (or `ANTHROPIC_API_KEY` with `LLM_PROVIDER=anthropic`) |
| `LLM_PROVIDER` | `gemini` | `gemini` \| `anthropic` |
| `EMBED_PROVIDER` | `local` | `local` (offline) \| `gemini` \| `voyage` |
| `VECTOR_STORE` | `local` | `local` (file) \| `qdrant` |
| `DATABASE_URL` | `file:./dev.db` | SQLite (ephemeral in-container) — see persistence note |

**Persistence note:** SQLite in a container is ephemeral. For durable incident history, mount a
volume at `/app/prisma`, or switch to Postgres (Path B's DB step). The app works fine without
durable persistence — saving is best-effort.

---

## Path B — Vercel (serverless) + managed services

Vercel functions can't run the native local-embedding runtime, so **switch the data plane to managed
APIs**:

1. **Embeddings → API** (local onnx won't run serverless): `EMBED_PROVIDER=gemini` (or `voyage`).
2. **Vector store → Qdrant Cloud**: `VECTOR_STORE=qdrant`, set `QDRANT_URL` + `QDRANT_API_KEY`.
3. **DB → managed Postgres** (Neon / Supabase): set `DATABASE_URL`; in `prisma/schema.prisma`
   change `provider` to `postgresql` and restore the enum types (kept as comments), then
   `prisma migrate deploy`.
4. **Populate the index once** (locally or in CI, against the same Qdrant):
   ```bash
   EMBED_PROVIDER=gemini VECTOR_STORE=qdrant npm run ingest
   ```
5. Deploy to Vercel; set all env vars in the project. `maxDuration` on `/api/analyze` is already 120s.

| Var | Value |
|---|---|
| `LLM_PROVIDER` | `gemini` or `anthropic` (+ that provider's key) |
| `EMBED_PROVIDER` | `gemini` or `voyage` (+ key) |
| `VECTOR_STORE` | `qdrant` (+ `QDRANT_URL`, `QDRANT_API_KEY`) |
| `DATABASE_URL` | managed Postgres URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | optional — enables auth |

---

## Auth (optional, either path)

Set real Clerk keys (`pk_…` / `sk_…`) to enable sign-in; without them auth stays off and the app is
fully usable. Incidents tie to the Clerk `userId` when signed in.

## Pre-deploy checklist

```bash
npm run test          # vitest — 17 unit tests
npx tsc --noEmit      # typecheck
npm run build         # production build
```
