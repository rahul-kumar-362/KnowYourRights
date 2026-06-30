/**
 * Pure legal-text classification helpers (no I/O). Shared by the BNSS scrapers
 * and unit-tested directly — these parse grounding-critical attributes, so they
 * must be deterministic and tested in isolation.
 */

/** Normalize a First-Schedule "cognizable" cell. Returns null if unparseable. */
export function normCognizable(raw: string): string | null {
  const s = raw.toLowerCase();
  const z = s.replace(/[\s-]+/g, ""); // repair pdf/word splits ("non- cognizable")
  if (!z.includes("cognizable")) return null;
  if (s.includes("according as") || z.includes("accordingas")) return "Varies (per underlying offence)";
  if (z.includes("noncognizable")) return "Non-cognizable";
  return "Cognizable";
}

/** Normalize a First-Schedule "bailable" cell. Returns null if unparseable. */
export function normBailable(raw: string): string | null {
  const s = raw.toLowerCase();
  const z = s.replace(/[\s-]+/g, "");
  if (!z.includes("bailable")) return null;
  if (s.includes("according as") || z.includes("accordingas")) return "Varies (per underlying offence)";
  if (z.includes("nonbailable")) return "Non-bailable";
  return "Bailable";
}

/** Strip §359 compounding-table noise ("(45 of 2023)", "1 23" headers, act name). */
function cleanCompounding(s: string): string {
  return s
    .replace(/\(\s*45\s+of\s+2023\s*\)/g, " ")
    .replace(/Bharatiya\s+Nyaya\s+Sanhita,?/gi, " ")
    .replace(/\b1\s+2\s*3\b/g, " ")
    .replace(/\b2023\b/g, " ");
}

/** Extract base BNS section numbers (1..358) from a §359 compounding-table slice. */
export function extractCompoundingSectionNumbers(slice: string): Set<string> {
  const out = new Set<string>();
  for (const m of cleanCompounding(slice).matchAll(/(\d{1,3})(?:\([0-9A-Za-z]+\))?/g)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 358) out.add(m[1]);
  }
  return out;
}
