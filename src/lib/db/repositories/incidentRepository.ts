import { prisma } from "@/lib/db/prisma";
import type { AnalysisResult } from "@/lib/ai/schemas";

interface SaveArgs {
  rawText: string;
  language: string;
  userId?: string | null;
  result: AnalysisResult;
}

/**
 * Persist an analysis: the Incident (raw text + structured analysis + report +
 * confidence) and one Citation per verifier-confirmed law (the audit trail).
 * The only place that talks to Prisma for incidents (repository pattern).
 */
export async function saveAnalysis({ rawText, language, userId, result }: SaveArgs): Promise<string> {
  if (userId) {
    await prisma.user.upsert({ where: { id: userId }, create: { id: userId }, update: {} });
  }

  const incident = await prisma.incident.create({
    data: {
      rawText,
      language,
      userId: userId ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      analysis: result.analysis as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      report: result.report as any,
      confidence: result.confident,
      citations: {
        create: result.report.applicableLaws.map((l) => ({
          actCode: l.act,
          sectionNo: l.section,
          verified: true,
        })),
      },
    },
  });
  return incident.id;
}

/** Recent incidents (optionally for a user) — for a history view. */
export async function recentIncidents(userId?: string | null, take = 20) {
  return prisma.incident.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, rawText: true, language: true, confidence: true, createdAt: true },
  });
}
