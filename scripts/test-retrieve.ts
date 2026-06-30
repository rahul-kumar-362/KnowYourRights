/**
 * Retrieval-only probe (no LLM, no quota): embed a query locally + search the
 * vector store, print the top chunks. Verifies the corpus is retrievable.
 *
 * Run: npm run test:retrieve -- "my query"   (or no args for the default set)
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

const DEFAULTS = [
  "defective washing machine company refuses refund or replacement",
  "car hit my bike and drove away hit and run accident",
  "government office ignored my RTI application no information given",
  "husband beats me and threatens me domestic violence",
  "builder delayed flat possession and took my money real estate",
  "child sexually abused by a relative",
];

async function main() {
  const { retrieve } = await import("@/lib/rag/retriever");
  const queries = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULTS;

  for (const q of queries) {
    const r = await retrieve(q, 6);
    console.log(`\nQ: ${q}`);
    console.log(`   topScore=${r.topScore.toFixed(3)} confident=${r.confident}`);
    for (const c of r.chunks) {
      console.log(`   ${c.actShortCode.padEnd(6)} §${(c.sectionNumber + "").padEnd(6)} ${c.score.toFixed(3)}  ${c.sectionTitle.slice(0, 44)}`);
    }
  }
}

main().catch((e) => {
  console.error("test:retrieve failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
