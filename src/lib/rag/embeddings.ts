import { env } from "@/lib/config/env";

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-law-2"; // legal-domain, 1024-dim
const GEMINI_EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/openai/embeddings";

const isGemini = () => env().EMBED_PROVIDER === "gemini";
const isLocal = () => env().EMBED_PROVIDER === "local";
// Dim only matters for the Qdrant collection; the local store is dim-agnostic.
export const EMBED_DIM = 384; // bge-small-en-v1.5 (local). bge-base 768, Gemini 768, Voyage 1024.

// BGE/GTE-family models use CLS pooling and a query-side instruction prefix;
// MiniLM-family use mean pooling and no prefix.
const BGE_QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";

// transformers.js feature-extraction pipeline (lazy singleton, reloads on model change).
let extractor: ((text: string, opts: object) => Promise<{ data: Float32Array }>) | null = null;
let loadedModel = "";

async function localEmbed(texts: string[], isQuery = false): Promise<number[][]> {
  const model = env().LOCAL_EMBED_MODEL;
  if (!extractor || loadedModel !== model) {
    const { pipeline } = await import("@huggingface/transformers");
    extractor = (await pipeline("feature-extraction", model)) as never;
    loadedModel = model;
  }
  const cls = /bge|gte/i.test(model);
  const pooling = cls ? "cls" : "mean";
  const prefix = isQuery && cls ? BGE_QUERY_PREFIX : "";
  const out: number[][] = [];
  for (const t of texts) {
    const r = await extractor!(prefix + t, { pooling, normalize: true });
    out.push(Array.from(r.data));
  }
  return out;
}

type InputType = "query" | "document";

interface EmbedResponse {
  data: { embedding: number[]; index: number }[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(
  url: string,
  key: string,
  body: unknown,
  what: string,
  attempt = 1,
): Promise<number[][]> {
  let res: Response;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 60_000);
    res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
  } catch (err) {
    // Network drop (ECONNRESET) / timeout — retry with backoff.
    if (attempt <= 6) {
      await sleep(5_000 * attempt);
      return post(url, key, body, what, attempt + 1);
    }
    throw err;
  }
  if (res.status === 429 && attempt <= 6) {
    await sleep(15_000 * attempt); // free-tier TPM backoff
    return post(url, key, body, what, attempt + 1);
  }
  if (!res.ok) {
    const b = await res.text().catch(() => "");
    throw new Error(`${what} embeddings failed (${res.status}): ${b.slice(0, 300)}`);
  }
  const json = (await res.json()) as EmbedResponse;
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function voyage(inputs: string[], inputType: InputType): Promise<number[][]> {
  const key = env().VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY required when EMBED_PROVIDER=voyage");
  return post(VOYAGE_URL, key, { model: VOYAGE_MODEL, input: inputs, input_type: inputType }, "Voyage");
}

async function gemini(inputs: string[]): Promise<number[][]> {
  const key = env().GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY required when EMBED_PROVIDER=gemini");
  return post(GEMINI_EMBED_URL, key, { model: env().GEMINI_EMBED_MODEL, input: inputs }, "Gemini");
}

/** Embed many documents for ingestion. */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (isLocal()) return localEmbed(texts, false);
  const batch = isGemini() ? 50 : 128;
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += batch) {
    const slice = texts.slice(i, i + batch);
    out.push(...(isGemini() ? await gemini(slice) : await voyage(slice, "document")));
  }
  return out;
}

/** Embed a single user query for retrieval. */
export async function embedQuery(text: string): Promise<number[]> {
  if (isLocal()) return (await localEmbed([text], true))[0];
  const [vec] = isGemini() ? await gemini([text]) : await voyage([text], "query");
  return vec;
}
