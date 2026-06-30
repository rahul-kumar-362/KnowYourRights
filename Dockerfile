# KnowYourRights — production image (Node host: Railway / Render / Fly / VM).
# Self-contained: bundles the corpus + a locally-built vector index + local
# embeddings, so it runs with only a Gemini (or Anthropic) key at runtime.
# For serverless (Vercel) + managed services, see DEPLOYMENT.md instead.

# ---- build ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV DATABASE_URL=file:./dev.db
# Prisma client + SQLite schema
RUN npx prisma generate && npx prisma db push --skip-generate
# Build the local vector index (local embeddings — no API keys needed at build).
RUN EMBED_PROVIDER=local VECTOR_STORE=local npm run ingest
# Next production build
RUN npm run build

# ---- run ----
FROM node:20-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Defaults; override at deploy. GEMINI_API_KEY (or ANTHROPIC_API_KEY) is required at runtime.
ENV LLM_PROVIDER=gemini
ENV EMBED_PROVIDER=local
ENV VECTOR_STORE=local
ENV DATABASE_URL=file:./dev.db
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/data ./data
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
EXPOSE 3000
CMD ["npm", "run", "start"]
