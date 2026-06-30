/**
 * Fill cognizable / bailable / court on BNS sections from the BNSS First
 * Schedule (Part I — classification of offences under the BNS).
 *
 * Source: the official NCRB (National Crime Records Bureau) HTML rendering of
 * the BNSS First Schedule. This is a clean 6-column HTML table — far more
 * reliable than coordinate-parsing the gazette PDF (which has no ruled lines).
 * Columns: Section | Offence | Punishment | Cognizable | Bailable | Court.
 *
 * Each <tr> is one classification entry. A section with multiple offence
 * sub-rows (e.g. 303(2) theft vs the petty-theft community-service variant)
 * has the section number only on the first row; later rows have an empty
 * section cell and their own classification. We aggregate per top-level BNS
 * section: if sub-rows disagree, the value becomes "Varies by sub-section".
 *
 * Run: npm run build:bnss-schedule
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { normCognizable, normBailable } from "@/lib/legal/classify";

const NCRB_URL = "https://cytrain.ncrb.gov.in/staticpage/web_pages/ScheduleBNSS.html";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const RAW = join(process.cwd(), "data", "raw", "ncrb_schedule_bnss.html");
const BNS_CORPUS = join(process.cwd(), "data", "corpus", "bns.json");
const DERIVED = join(process.cwd(), "data", "corpus", "derived", "bns-first-schedule.json");

const ENT: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " ",
};
const clean = (s: string) =>
  s.replace(/<[^>]+>/g, " ").replace(/&#?\w+;/g, (m) => ENT[m] ?? " ").replace(/\s+/g, " ").trim();

interface Row {
  section: string;
  topSection: string;
  offence: string;
  punishment: string;
  cognizableRaw: string;
  bailableRaw: string;
  court: string;
  cognizable: string | null;
  bailable: string | null;
  needsReview: boolean;
}

const SEC_RE = /^(\d{1,3}[A-Z]?)(\([0-9A-Za-z]+\))?/;

async function ensureHtml(): Promise<string> {
  if (existsSync(RAW)) return readFileSync(RAW, "utf8");
  mkdirSync(join(process.cwd(), "data", "raw"), { recursive: true });
  console.log("Downloading NCRB BNSS Schedule…");
  const res = await fetch(NCRB_URL, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Failed to download NCRB schedule: HTTP ${res.status}`);
  const html = await res.text();
  writeFileSync(RAW, html, "utf8");
  return html;
}

function parsePartI(html: string): Row[] {
  // Part I is the first <table> on the page.
  const firstTable = "<table" + html.split(/<table/i)[1].split(/<\/table>/i)[0];
  const trs = firstTable.split(/<tr/i).slice(1);
  const rows: Row[] = [];
  let lastSection = "";

  for (const tr of trs) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => clean(m[1]));
    if (cells.length < 6) continue;
    const [secCell, offence, punishment, cogRaw, bailRaw, court] = cells;

    // Skip header ("Section") and column-number ("1 2 3…") rows.
    if (/^section$/i.test(secCell) || (secCell === "1" && cells[1] === "2")) continue;

    const secMatch = (secCell || "").match(SEC_RE);
    const section = secMatch ? secCell : lastSection;
    const topSection = secMatch ? secMatch[1] : lastSection.match(SEC_RE)?.[1] ?? "";
    if (secMatch) lastSection = secCell;
    if (!topSection) continue; // pre-table noise with no section context

    const cognizable = normCognizable(cogRaw);
    const bailable = normBailable(bailRaw);
    rows.push({
      section, topSection, offence, punishment,
      cognizableRaw: cogRaw, bailableRaw: bailRaw, court,
      cognizable, bailable,
      needsReview: cognizable === null || bailable === null,
    });
  }
  return rows;
}

function agree(vals: (string | null)[]): string | null {
  const set = new Set(vals.filter((v): v is string => Boolean(v)));
  if (set.size === 0) return null;
  if (set.size === 1) return [...set][0];
  return "Varies by sub-section (see BNSS First Schedule)";
}

async function main() {
  const html = await ensureHtml();
  const rows = parsePartI(html);
  const valid = rows.filter((r) => !r.needsReview);
  console.log(`Parsed ${rows.length} schedule rows; ${valid.length} validated, ${rows.length - valid.length} need review.`);

  mkdirSync(join(process.cwd(), "data", "corpus", "derived"), { recursive: true });
  writeFileSync(DERIVED, JSON.stringify({ _source: NCRB_URL, rows }, null, 2), "utf8");

  // Aggregate per top-level BNS section.
  const bySection = new Map<string, Row[]>();
  for (const r of valid) {
    if (!bySection.has(r.topSection)) bySection.set(r.topSection, []);
    bySection.get(r.topSection)!.push(r);
  }

  const corpus = JSON.parse(readFileSync(BNS_CORPUS, "utf8"));
  for (const sec of corpus.sections) {
    sec.cognizable = "See BNSS First Schedule";
    sec.bailable = "See BNSS First Schedule";
    sec.court = "";
  }
  let filled = 0;
  for (const sec of corpus.sections) {
    const matches = bySection.get(sec.number);
    if (!matches?.length) continue;
    const cog = agree(matches.map((m) => m.cognizable));
    const bail = agree(matches.map((m) => m.bailable));
    const court = agree(matches.map((m) => m.court || null));
    if (cog) sec.cognizable = cog;
    if (bail) sec.bailable = bail;
    if (court) sec.court = court;
    if (cog || bail) filled++;
  }

  corpus._classificationProvenance =
    "cognizable/bailable/court from the BNSS First Schedule, Part I, via the official NCRB HTML table " +
    `(${NCRB_URL}). Aggregated per BNS section; sub-section conflicts marked 'Varies by sub-section'. ` +
    "compoundable still pending (BNSS Section 359).";
  writeFileSync(BNS_CORPUS, JSON.stringify(corpus, null, 2), "utf8");
  console.log(`Filled classification on ${filled}/${corpus.sections.length} BNS sections.`);
  console.log(`Distinct offence sections in schedule: ${bySection.size}`);
}

main().catch((err) => {
  console.error("BNSS First Schedule build failed:", err);
  process.exit(1);
});
