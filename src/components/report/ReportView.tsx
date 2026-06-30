"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  FolderOpen,
  Gavel,
  Info,
  ListChecks,
  Phone,
  Printer,
  Scale,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { AnalysisResult, ApplicableLaw, Verification } from "@/lib/ai/schemas";

/* ------------------------------------------------------------------ helpers */

function provenanceVariant(p: ApplicableLaw["provenance"]) {
  if (p === "Retrieved source") return "success" as const;
  if (p === "Model inference") return "warning" as const;
  return "muted" as const;
}

type Verdict = Verification["verifiedLaws"][number] | undefined;

function verdictBadge(v: Verdict) {
  if (!v) return null;
  if (v.verdict === "confirmed" && v.relevant)
    return <Badge variant="success">Verified</Badge>;
  if (v.verdict === "confirmed")
    return <Badge variant="info">Grounded · review fit</Badge>;
  if (v.verdict === "mismatch") return <Badge variant="danger">Mismatch</Badge>;
  return <Badge variant="warning">Unsupported</Badge>;
}

function buildPlainText(result: AnalysisResult): string {
  const r = result.report;
  const L: string[] = [];
  L.push("KNOWYOURRIGHTS — LEGAL ANALYSIS\n");
  L.push("INCIDENT SUMMARY\n" + r.incidentSummary + "\n");
  L.push("LEGAL ISSUES\n" + r.legalIssues.map((x) => "- " + x).join("\n") + "\n");
  L.push(
    "APPLICABLE LAWS\n" +
      r.applicableLaws
        .map(
          (l) =>
            `- ${l.act} §${l.section} — ${l.reason} (max: ${l.maxPunishment}; bailable: ${l.bailable}; cognizable: ${l.cognizable}; ${l.provenance})`,
        )
        .join("\n") +
      "\n",
  );
  L.push("WHAT TO DO NOW\n" + r.whatToDoNow.map((x, i) => `${i + 1}. ${x}`).join("\n") + "\n");
  L.push("DOCUMENTS REQUIRED\n" + r.documentsRequired.map((x) => "- " + x).join("\n") + "\n");
  L.push("EVIDENCE REQUIRED\n" + r.evidenceRequired.map((x) => "- " + x).join("\n") + "\n");
  L.push(
    "AUTHORITIES\n" +
      r.authoritiesToContact
        .map((a) => `- ${a.name}${a.contact ? " (" + a.contact + ")" : ""} — ${a.why}`)
        .join("\n") +
      "\n",
  );
  L.push("LEGAL TIMELINE\n" + r.legalTimeline.map((x) => "- " + x).join("\n") + "\n");
  L.push("IMPORTANT WARNINGS\n" + r.importantWarnings.map((x) => "- " + x).join("\n") + "\n");
  L.push(result.disclaimer);
  return L.join("\n");
}

/* --------------------------------------------------------------- primitives */

function Section({
  icon: Icon,
  title,
  className,
  children,
}: {
  icon: React.ElementType;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("kyr-card", className)}>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <CardTitle className="flex-1 text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-relaxed">{children}</CardContent>
    </Card>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-muted-foreground">None identified.</p>;
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div className="kyr-card flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-shadow hover:shadow-sm">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          tone === "success" && "bg-success/15 text-success",
          tone === "warning" && "bg-warning/15 text-warning",
          tone === "default" && "bg-primary-soft text-primary",
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-semibold leading-none tabular-nums">{value}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- law fragments */

function LawRows({ laws, vmap }: { laws: ApplicableLaw[]; vmap: Map<string, Verdict> }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[820px] border-collapse text-left text-xs">
        <thead className="text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-2.5 pr-3 font-medium">Act</th>
            <th className="py-2.5 pr-3 font-medium">Section</th>
            <th className="py-2.5 pr-3 font-medium">Why it applies</th>
            <th className="py-2.5 pr-3 font-medium">Max punishment</th>
            <th className="py-2.5 pr-3 font-medium">Bailable</th>
            <th className="py-2.5 pr-3 font-medium">Cognizable</th>
            <th className="py-2.5 pr-3 font-medium">Compoundable</th>
            <th className="py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {laws.map((l, i) => (
            <tr key={i} className="border-b border-border/50 align-top">
              <td className="py-3 pr-3 font-medium">{l.act}</td>
              <td className="py-3 pr-3 font-mono text-primary">{l.section}</td>
              <td className="py-3 pr-3 text-muted-foreground">{l.reason}</td>
              <td className="py-3 pr-3">{l.maxPunishment}</td>
              <td className="py-3 pr-3">{l.bailable}</td>
              <td className="py-3 pr-3">{l.cognizable}</td>
              <td className="py-3 pr-3">{l.compoundable}</td>
              <td className="py-3">
                <div className="flex flex-col gap-1">
                  <Badge variant={provenanceVariant(l.provenance)}>{l.provenance}</Badge>
                  {l.applicability === "conditional" && (
                    <Badge variant="warning">conditional</Badge>
                  )}
                  {verdictBadge(vmap.get(`${l.act}|${l.section}`))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LawCards({ laws, vmap }: { laws: ApplicableLaw[]; vmap: Map<string, Verdict> }) {
  return (
    <div className="space-y-3 md:hidden">
      {laws.map((l, i) => (
        <div key={i} className="kyr-avoid-break rounded-lg border border-border bg-muted/40 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="break-words font-medium">{l.act}</p>
              <p className="font-mono text-sm text-primary">§ {l.section}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant={provenanceVariant(l.provenance)}>{l.provenance}</Badge>
              {verdictBadge(vmap.get(`${l.act}|${l.section}`))}
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{l.reason}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Field label="Max punishment" value={l.maxPunishment} />
            <Field label="Bailable" value={l.bailable} />
            <Field label="Cognizable" value={l.cognizable} />
            <Field label="Compoundable" value={l.compoundable} />
          </dl>
        </div>
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------- report */

export function ReportView({ result }: { result: AnalysisResult }) {
  const { report, confident, verification, retrievalTopScore } = result;
  const [copied, setCopied] = useState(false);
  const reduce = useReducedMotion();

  // Mount-stagger entrance. Disabled under reduced-motion; print neutralizes any
  // in-flight transform via globals.css so nothing ever prints blank.
  const container = reduce ? {} : { initial: "hidden", animate: "show", variants: staggerContainer(0.05) };
  const item = reduce ? {} : { variants: fadeUp };

  const vmap = new Map<string, Verdict>(
    verification.verifiedLaws.map((v) => [`${v.act}|${v.section}`, v]),
  );
  const verifiedCount = verification.verifiedLaws.filter(
    (v) => v.verdict === "confirmed" && v.relevant,
  ).length;

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(buildPlainText(result));
      setCopied(true);
      toast.success("Report copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access.");
    }
  }

  return (
    <motion.div {...container} className="print-report space-y-4">
      {/* Toolbar */}
      <motion.div
        {...item}
        className="print-hide flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Scale className="size-4 text-primary" aria-hidden />
          <span>Legal analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={copyReport}>
            {copied ? <CheckCircle2 className="size-4 text-success" /> : <Copy className="size-4" />}
            Copy
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="size-4" /> Print / PDF
          </Button>
        </div>
      </motion.div>

      {/* Confidence banner */}
      <motion.div {...item}>
        {confident ? (
          <div className="kyr-card flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <p>
              <strong className="text-success">Grounded in verified statutes.</strong> The cited
              sections were matched against retrieved official law text (top match{" "}
              {retrievalTopScore.toFixed(2)}). Still informational — confirm with a lawyer before
              acting.
            </p>
          </div>
        ) : (
          <div className="kyr-card flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <p>
              <strong className="text-warning">Limited confidence.</strong> Few grounded sources
              matched this incident (top match {retrievalTopScore.toFixed(2)}). Treat the guidance as
              general information only and consult a qualified lawyer.
            </p>
          </div>
        )}
      </motion.div>

      {/* Hero summary */}
      <motion.div {...item}>
        <Card className="kyr-card overflow-hidden">
          <div className="kyr-aurora">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <FileText className="size-[18px]" aria-hidden />
              </span>
              <CardTitle className="text-base">Incident summary</CardTitle>
            </CardHeader>
            <CardContent className="text-[15px] leading-relaxed">
              {report.incidentSummary}
            </CardContent>
          </div>
        </Card>
      </motion.div>

      {/* Stats */}
      <motion.div {...item} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Gavel} label="Applicable laws" value={report.applicableLaws.length} />
        <Stat
          icon={ShieldCheck}
          label="Verified citations"
          value={verifiedCount}
          tone={verifiedCount > 0 ? "success" : "warning"}
        />
        <Stat icon={ListChecks} label="Action steps" value={report.whatToDoNow.length} />
        <Stat
          icon={TrendingUp}
          label="Top source match"
          value={`${Math.round(retrievalTopScore * 100)}%`}
          tone={confident ? "success" : "warning"}
        />
      </motion.div>

      <motion.div {...item}>
        <Section icon={Scale} title="Legal issues detected">
          <BulletList items={report.legalIssues} />
        </Section>
      </motion.div>

      <motion.div {...item}>
        <Section icon={Gavel} title="Applicable Indian laws">
          {report.applicableLaws.length === 0 ? (
            <p className="text-muted-foreground">
              No statutory sections could be grounded in verified sources for this incident.
            </p>
          ) : (
            <>
              <LawRows laws={report.applicableLaws} vmap={vmap} />
              <LawCards laws={report.applicableLaws} vmap={vmap} />
            </>
          )}
        </Section>
      </motion.div>

      {/* Action plan — emphasized */}
      <motion.div {...item}>
        <Card className="kyr-card border-primary/30">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ListChecks className="size-[18px]" aria-hidden />
            </span>
            <CardTitle className="text-base">What you should do now</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {report.whatToDoNow.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-sm leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </motion.div>

      {/* Documents + evidence */}
      <motion.div {...item} className="grid gap-4 md:grid-cols-2">
        <Section icon={FolderOpen} title="Documents required">
          <BulletList items={report.documentsRequired} />
        </Section>
        <Section icon={Camera} title="Evidence to preserve">
          <BulletList items={report.evidenceRequired} />
        </Section>
      </motion.div>

      {/* Rights */}
      <motion.div {...item} className="grid gap-4 md:grid-cols-2">
        <Section icon={ShieldCheck} title="Constitutional rights">
          {report.constitutionalRights.length === 0 ? (
            <p className="text-muted-foreground">None specifically applicable.</p>
          ) : (
            <ul className="space-y-2.5">
              {report.constitutionalRights.map((r, i) => (
                <li key={i}>
                  <span className="font-medium text-primary">{r.article}</span> — {r.description}
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section icon={ShieldCheck} title="Your rights as a citizen">
          <BulletList items={report.citizenRights} />
        </Section>
      </motion.div>

      {/* Authorities */}
      <motion.div {...item}>
        <Section icon={Building2} title="Authorities to contact">
          <ul className="space-y-3">
            {report.authoritiesToContact.map((a, i) => (
              <li
                key={i}
                className="kyr-avoid-break rounded-lg border border-border bg-muted/40 p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 break-words font-medium">{a.name}</span>
                  {a.contact ? (
                    <a
                      href={`tel:${a.contact.replace(/[^\d+]/g, "")}`}
                      className="shrink-0 font-mono text-xs text-primary hover:underline"
                    >
                      {a.contact}
                    </a>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.why}</p>
              </li>
            ))}
          </ul>
        </Section>
      </motion.div>

      {/* Emergency */}
      {report.emergencyContacts.length > 0 && (
        <motion.div {...item}>
          <Section icon={Phone} title="Emergency contacts">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {report.emergencyContacts.map((c, i) => (
                <a
                  key={i}
                  href={`tel:${c.number.replace(/[^\d+]/g, "")}`}
                  className="kyr-avoid-break flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 transition-colors hover:bg-destructive/20"
                >
                  <span className="min-w-0 truncate text-sm font-medium">{c.name}</span>
                  <span className="shrink-0 font-mono text-base font-semibold text-destructive">
                    {c.number}
                  </span>
                </a>
              ))}
            </div>
          </Section>
        </motion.div>
      )}

      {/* Timeline */}
      <motion.div {...item}>
        <Section icon={Clock} title="Legal timeline">
          {report.legalTimeline.length === 0 ? (
            <p className="text-muted-foreground">None identified.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-6">
              {report.legalTimeline.map((t, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[26px] top-1 size-3 rounded-full border-2 border-background bg-primary" />
                  <span className="text-sm">{t}</span>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </motion.div>

      {/* Outcomes */}
      <motion.div {...item}>
        <Section icon={TrendingUp} title="Possible outcomes">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="kyr-avoid-break rounded-lg border border-success/30 bg-success/10 p-3.5">
              <Badge variant="success">Best case</Badge>
              <p className="mt-2 text-sm">{report.possibleOutcomes.bestCase}</p>
            </div>
            <div className="kyr-avoid-break rounded-lg border border-border bg-muted/50 p-3.5">
              <Badge variant="muted">Average case</Badge>
              <p className="mt-2 text-sm">{report.possibleOutcomes.averageCase}</p>
            </div>
            <div className="kyr-avoid-break rounded-lg border border-warning/30 bg-warning/10 p-3.5">
              <Badge variant="warning">Worst case</Badge>
              <p className="mt-2 text-sm">{report.possibleOutcomes.worstCase}</p>
            </div>
          </div>
        </Section>
      </motion.div>

      {/* Warnings */}
      {report.importantWarnings.length > 0 && (
        <motion.div {...item}>
          <Card className="kyr-card border-warning/30 bg-warning/5">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
                <AlertTriangle className="size-[18px]" aria-hidden />
              </span>
              <CardTitle className="text-base">Important warnings</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {report.importantWarnings.map((w, i) => (
                  <li key={i} className="flex gap-2.5">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                    <span className="text-sm">{w}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Disclaimer */}
      <motion.div {...item}>
        <Section icon={Info} title="Disclaimer">
          <p className="text-muted-foreground">{result.disclaimer}</p>
          {verification.notes && (
            <details className="mt-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Verification details
              </summary>
              <p className="mt-2 leading-relaxed">{verification.notes}</p>
            </details>
          )}
        </Section>
      </motion.div>
    </motion.div>
  );
}
