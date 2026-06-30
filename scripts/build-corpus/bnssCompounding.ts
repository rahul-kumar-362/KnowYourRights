/**
 * Fill `compoundable` on BNS sections from BNSS Section 359 (Compounding of
 * offences). §359(1) lists offences compoundable WITHOUT court permission;
 * §359(2) lists offences compoundable WITH court permission. Offences not
 * listed in either are non-compoundable.
 *
 * Source: the §359 text already scraped into data/corpus/bnss.json (no new
 * fetch). The two tables key offences to BNS section numbers.
 *
 * Run: npm run build:compounding
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extractCompoundingSectionNumbers } from "@/lib/legal/classify";

const BNSS = join(process.cwd(), "data", "corpus", "bnss.json");
const BNS = join(process.cwd(), "data", "corpus", "bns.json");

function main() {
  const bnss = JSON.parse(readFileSync(BNSS, "utf8"));
  const s359 = bnss.sections.find((x: { number: string }) => x.number === "359");
  if (!s359) throw new Error("BNSS §359 not found in bnss.json");
  const t: string = s359.text;

  const withPermIdx = t.search(/permission of the Court/i);
  const tablesEndIdx = t.search(/abetment of such offence/i);
  if (withPermIdx < 0 || tablesEndIdx < 0) throw new Error("Could not locate §359 table boundaries");

  const set1 = extractCompoundingSectionNumbers(t.slice(0, withPermIdx)); // without permission
  const set2 = extractCompoundingSectionNumbers(t.slice(withPermIdx, tablesEndIdx)); // with permission
  // set1 wins if a section appears in both.
  for (const n of set1) set2.delete(n);

  const corpus = JSON.parse(readFileSync(BNS, "utf8"));
  const isClassified = (v: string | undefined) =>
    !!v && !v.startsWith("See") && v !== "NA"; // has a real First-Schedule classification → it's an offence

  const tally = { without: 0, with: 0, no: 0, na: 0 };
  for (const sec of corpus.sections) {
    if (set1.has(sec.number)) {
      sec.compoundable = "Yes (without court permission)";
      tally.without++;
    } else if (set2.has(sec.number)) {
      sec.compoundable = "Yes (with court permission)";
      tally.with++;
    } else if (isClassified(sec.cognizable)) {
      sec.compoundable = "No"; // offence not listed in §359 → non-compoundable
      tally.no++;
    } else {
      sec.compoundable = "NA";
      tally.na++;
    }
  }

  corpus._compoundingProvenance = "compoundable from BNSS Section 359 (compounding of offences) tables.";
  writeFileSync(BNS, JSON.stringify(corpus, null, 2), "utf8");

  console.log(`§359(1) without-permission sections: ${set1.size}`);
  console.log(`§359(2) with-permission sections: ${set2.size}`);
  console.log(`Merged → Yes(without): ${tally.without}, Yes(with): ${tally.with}, No: ${tally.no}, NA: ${tally.na}`);

  // Sanity: known outcomes.
  const check = (n: string) => corpus.sections.find((s: { number: string }) => s.number === n)?.compoundable;
  console.log("\nspot-check:");
  for (const [n, label] of [["303", "theft→Yes"], ["115", "hurt→Yes"], ["314", "misappropriation→Yes"], ["103", "murder→No"], ["64", "rape→No"], ["318", "cheating"]] as const) {
    console.log(`  §${n} (${label}): ${check(n)}`);
  }
}

main();
