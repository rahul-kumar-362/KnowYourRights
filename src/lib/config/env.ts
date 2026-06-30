import { z } from "zod";

/**
 * Fail-fast, typed environment access. No raw process.env anywhere else.
 * Core keys (Anthropic, Voyage, Qdrant) are required for the analyze pipeline.
 * Persistence/auth keys are optional so the slice can run before they're wired.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // LLM provider: "anthropic" (Claude) or "gemini" (Google, OpenAI-compat endpoint).
  LLM_PROVIDER: z.enum(["anthropic", "gemini"]).default("anthropic"),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),

  // Embeddings: "local" (transformers.js, zero-quota/offline), "voyage", or "gemini"
  EMBED_PROVIDER: z.enum(["local", "voyage", "gemini"]).default("local"),
  // BGE-small: strong open retriever (384d, CLS pooling, query-instruction prefix);
  // small download, reliable. Set to bge-base-en-v1.5 for higher quality.
  LOCAL_EMBED_MODEL: z.string().default("Xenova/bge-small-en-v1.5"),
  VOYAGE_API_KEY: z.string().optional(),
  GEMINI_EMBED_MODEL: z.string().default("text-embedding-004"),

  // Vector store: "local" (zero-infra file store, default) or "qdrant" (production)
  VECTOR_STORE: z.enum(["local", "qdrant"]).default("local"),
  QDRANT_URL: z.string().url().default("http://localhost:6333"),
  QDRANT_API_KEY: z.string().optional(),
  QDRANT_COLLECTION: z.string().default("kyr_legal"),

  // Optional — persistence / cache / auth
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProd = () => env().NODE_ENV === "production";
export const hasDatabase = () => Boolean(env().DATABASE_URL);
