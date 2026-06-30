/**
 * End-to-end pipeline test from the CLI (no web server needed).
 * Runs the full agent pipeline on an incident and prints the report.
 *
 * Run: npm run test:analyze -- "My employer hasn't paid my salary for 3 months"
 * Requires: ANTHROPIC_API_KEY + VOYAGE_API_KEY in .env, and `npm run ingest` done.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function loadEnv() {
  const path = join(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

async function main() {
  const { runAnalysis } = await import("@/lib/ai/orchestrator");
  const text =
    process.argv.slice(2).join(" ").trim() ||
    "My employer has not paid my salary for three months.";

  console.log(`\nIncident: ${text}\n${"=".repeat(60)}`);
  const started = Date.now();
  const r = await runAnalysis(text, "en");
  console.log(`Pipeline done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(`confident: ${r.confident} | retrievalTopScore: ${r.retrievalTopScore.toFixed(3)}\n`);

  console.log("Incident summary:");
  console.log("  " + r.report.incidentSummary + "\n");

  console.log("Applicable laws (verifier-confirmed only):");
  if (r.report.applicableLaws.length === 0) console.log("  (none grounded)");
  for (const l of r.report.applicableLaws) {
    console.log(`  - ${l.act} §${l.section} [${l.applicability}] — ${l.reason}`);
    console.log(`      punishment: ${l.maxPunishment} | ${l.bailable} | ${l.cognizable} | [${l.provenance}]`);
  }

  console.log("\nWhat to do now:");
  r.report.whatToDoNow.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));

  console.log("\nAuthorities to contact:");
  r.report.authoritiesToContact.forEach((a) => console.log(`  - ${a.name}${a.contact ? " · " + a.contact : ""}`));

  console.log(`\nVerifier: confident=${r.verification.overallConfident}`);
  console.log("Disclaimer: " + r.disclaimer);
}

main().catch((err) => {
  console.error("\ntest:analyze failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
