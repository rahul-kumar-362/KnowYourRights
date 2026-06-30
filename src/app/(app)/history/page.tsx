import Link from "next/link";
import { hasDatabase } from "@/lib/config/env";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // always reflect the latest saved incidents

function clerkOn() {
  const k = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return Boolean(k?.startsWith("pk_") && !k.includes("xxxx"));
}

type Row = {
  id: string;
  rawText: string;
  language: string;
  confidence: boolean;
  createdAt: Date;
};

async function load(): Promise<Row[]> {
  if (!hasDatabase()) return [];
  try {
    let userId: string | null = null;
    if (clerkOn()) {
      const { auth } = await import("@clerk/nextjs/server");
      userId = (await auth()).userId;
    }
    const { recentIncidents } = await import("@/lib/db/repositories/incidentRepository");
    return (await recentIncidents(userId)) as Row[];
  } catch {
    return [];
  }
}

export default async function HistoryPage() {
  const incidents = await load();

  return (
    <div className="px-5 py-10 md:px-8">
      <h1 className="mx-auto mb-6 w-full max-w-3xl text-2xl font-semibold tracking-tight">
        Your past analyses
      </h1>

      <div className="mx-auto w-full max-w-3xl space-y-3">
        {!hasDatabase() && (
          <p className="text-sm text-muted-foreground">
            History is unavailable — no database configured (<code>DATABASE_URL</code>).
          </p>
        )}
        {hasDatabase() && incidents.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No saved analyses yet. <Link href="/chat" className="text-primary">Analyze a situation →</Link>
          </p>
        )}
        {incidents.map((inc) => (
          <Card key={inc.id}>
            <CardContent className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm">{inc.rawText}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(inc.createdAt).toLocaleString()} · {inc.language.toUpperCase()}
                </p>
              </div>
              <Badge variant={inc.confidence ? "success" : "warning"}>
                {inc.confidence ? "confident" : "low confidence"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
