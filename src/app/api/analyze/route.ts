import { NextResponse } from "next/server";
import { runAnalysis } from "@/lib/ai/orchestrator";
import { AnalyzeRequestSchema } from "@/lib/validation/analyze";
import { logger } from "@/lib/logger";
import { hasDatabase } from "@/lib/config/env";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";
import type { AnalysisResult } from "@/lib/ai/schemas";

export const runtime = "nodejs";
export const maxDuration = 120; // agent pipeline can run up to ~2 min

const clerkOn = () => {
  const k = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return Boolean(k?.startsWith("pk_") && !k.includes("xxxx"));
};

/** Best-effort persistence — never fails the request. */
async function persist(text: string, language: string, result: AnalysisResult) {
  if (!hasDatabase()) return;
  try {
    let userId: string | null = null;
    if (clerkOn()) {
      const { auth } = await import("@clerk/nextjs/server");
      userId = (await auth()).userId;
    }
    const { saveAnalysis } = await import("@/lib/db/repositories/incidentRepository");
    const id = await saveAnalysis({ rawText: text, language, userId, result });
    logger.info("incident.persisted", { id, userId });
  } catch (err) {
    logger.warn("incident.persist_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function POST(req: Request) {
  const rl = rateLimit(`analyze:${clientIp(req)}`, 12, 60_000); // 12/min/IP
  if (!rl.ok) return tooMany(rl.retryAfter);

  const started = Date.now();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  try {
    const result = await runAnalysis(parsed.data.text, parsed.data.language);
    logger.info("analyze.success", {
      ms: Date.now() - started,
      confident: result.confident,
      laws: result.report.applicableLaws.length,
    });
    await persist(parsed.data.text, parsed.data.language, result);
    return NextResponse.json(result);
  } catch (err) {
    logger.error("analyze.failed", {
      ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 },
    );
  }
}
