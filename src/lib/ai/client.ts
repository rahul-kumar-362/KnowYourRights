import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { env } from "@/lib/config/env";

const provider = () => env().LLM_PROVIDER;

export const MODELS =
  env().LLM_PROVIDER === "gemini"
    ? { reasoning: env().GEMINI_MODEL, fast: env().GEMINI_MODEL }
    : { reasoning: "claude-opus-4-8", fast: "claude-haiku-4-5" };

let anthropicClient: Anthropic | null = null;
function anthropic(): Anthropic {
  if (anthropicClient) return anthropicClient;
  const key = env().ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic");
  anthropicClient = new Anthropic({ apiKey: key });
  return anthropicClient;
}

interface StructuredOpts<T extends z.ZodType> {
  model: string;
  system: string;
  user: string;
  schema: T;
  schemaName: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high" | "max";
  thinking?: boolean;
}

/** Run a structured-output call and return the validated object. */
export async function runStructured<T extends z.ZodType>(opts: StructuredOpts<T>): Promise<z.infer<T>> {
  return provider() === "gemini" ? runGemini(opts) : runAnthropic(opts);
}

async function runAnthropic<T extends z.ZodType>(opts: StructuredOpts<T>): Promise<z.infer<T>> {
  const res = await anthropic().messages.parse({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 8000,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    ...(opts.thinking ? { thinking: { type: "adaptive" } } : {}),
    output_config: {
      ...(opts.effort ? { effort: opts.effort } : {}),
      format: zodOutputFormat(opts.schema),
    },
  });
  if (!res.parsed_output) throw new Error(`Structured call '${opts.schemaName}' returned no parsed output`);
  return res.parsed_output;
}

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

/**
 * Gemini via its OpenAI-compatible endpoint — stable, SDK-free. Structured
 * output via response_format json_schema; the response is validated with the
 * same zod schema, so a malformed reply throws rather than passing through.
 */
async function runGemini<T extends z.ZodType>(opts: StructuredOpts<T>): Promise<z.infer<T>> {
  const key = env().GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is required when LLM_PROVIDER=gemini");

  const jsonSchema = z.toJSONSchema(opts.schema) as Record<string, unknown>;
  delete jsonSchema["$schema"];

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 8000,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: opts.schemaName, schema: jsonSchema },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini call '${opts.schemaName}' failed (${res.status}): ${body.slice(0, 400)}`);
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Gemini call '${opts.schemaName}' returned empty content`);

  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  let obj: unknown;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini call '${opts.schemaName}' returned non-JSON: ${cleaned.slice(0, 200)}`);
  }
  return opts.schema.parse(obj);
}
