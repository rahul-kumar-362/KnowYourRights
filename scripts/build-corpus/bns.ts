/**
 * Build data/corpus/bns.json from the OFFICIAL Bharatiya Nyaya Sanhita, 2023
 * on indiacode.nic.in. No statute text is authored by hand — every section's
 * text is fetched verbatim from the official per-section endpoint.
 *
 *   show-data?actid=...&orderno=N   → HTML (section number, title, internal secId)
 *   /SectionPageContent?actid=...&sectionID=secId → JSON { content, footnote }
 *
 * Run: npm run build:bns
 *
 * Classification flags (bailable / cognizable / compoundable) are NOT in the
 * BNS — they live in the BNSS First Schedule — so they are set to a truthful
 * placeholder here and filled by a separate BNSS pass, never guessed.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://www.indiacode.nic.in";
const ACTID = "AC_CEN_5_23_00048_2023-45_1719292564123";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const MAX_ORDERNO = Number(process.env.BNS_MAX ?? 600); // BNS has 358 sections; orderno also covers chapter headers
const MIN_EXPECTED_SECTIONS = Number(process.env.BNS_MIN ?? 350); // fail loud if a blocked/partial run yields fewer
const DELAY_MS = Number(process.env.BNS_DELAY ?? 250);

interface OutSection {
  number: string;
  title: string;
  text: string;
  punishment: string;
  bailable: string;
  cognizable: string;
  compoundable: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url: string, attempt = 1): Promise<string> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20_000);
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    if (attempt >= 3) throw err;
    await sleep(800 * attempt);
    return fetchText(url, attempt + 1);
  }
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

/** Turn the section-body HTML fragment into clean plain text. */
function htmlToText(html: string): string {
  return html
    .replace(/\r\n?/g, "\n")
    .replace(/<\/?(br|hr)[^>]*>/gi, "\n")
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "") // drop footnote reference markers
    .replace(/<[^>]+>/g, "")
    .replace(/&#?\w+;/g, (m) => ENTITIES[m] ?? " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();
}

interface PageMeta {
  number: string | null; // section number, or null if this orderno is a chapter header
  title: string;
  secId: string | null;
  nextDisabled: boolean;
}

function parsePage(html: string): PageMeta {
  // Title block: <span class="label ...">Section 12.</span> &nbsp; Title text <span class="pull-right">
  const titleBlock = html.match(
    /class="sectionTitle title"[\s\S]*?<\/p>/i,
  )?.[0] ?? "";
  const number = titleBlock.match(/Section\s+(\d+[A-Z]?)\./i)?.[1] ?? null;
  let title = "";
  if (titleBlock) {
    const afterLabel = titleBlock.replace(/[\s\S]*?<\/span>/i, ""); // drop the "Section N." label span
    title = htmlToText(afterLabel.replace(/<span class="pull-right">[\s\S]*/i, ""));
  }
  const secId = html.match(/secId\s*=\s*'(\d+)'/)?.[1] ?? null;
  // Next is disabled on the final page.
  const nextDisabled = /class="disabled"[^>]*>Next</i.test(html) ||
    />Next<\/a>/i.test(html) === false;
  return { number, title, secId, nextDisabled };
}

async function fetchBody(secId: string): Promise<string> {
  const raw = await fetchText(`${BASE}/SectionPageContent?actid=${ACTID}&sectionID=${secId}`);
  const json = JSON.parse(raw) as { content?: string; footnote?: string };
  return htmlToText(json.content ?? "");
}

/** Heuristic max-punishment extraction from the section text (best-effort). */
function extractPunishment(text: string): string {
  const m = text.match(/shall be punished with[^.]*\./i);
  return m ? m[0].replace(/\s+/g, " ").trim() : "";
}

async function main() {
  const sections: OutSection[] = [];
  let stop = false;

  for (let orderno = 1; orderno <= MAX_ORDERNO && !stop; orderno++) {
    const html = await fetchText(
      `${BASE}/show-data?actid=${ACTID}&orderno=${orderno}&orgactid=${ACTID}`,
    );
    const meta = parsePage(html);

    if (meta.number && meta.secId) {
      const text = await fetchBody(meta.secId);
      sections.push({
        number: meta.number,
        title: meta.title,
        text,
        punishment: extractPunishment(text),
        bailable: "See BNSS First Schedule",
        cognizable: "See BNSS First Schedule",
        compoundable: "See BNSS First Schedule",
      });
      if (sections.length % 25 === 0) {
        console.log(`  …${sections.length} sections (orderno ${orderno})`);
      }
    } else {
      console.log(`  orderno ${orderno}: chapter header / non-section — skipped`);
    }

    if (meta.nextDisabled) stop = true;
    await sleep(DELAY_MS);
  }

  if (sections.length < MIN_EXPECTED_SECTIONS) {
    throw new Error(
      `Only ${sections.length} sections collected (expected >= ${MIN_EXPECTED_SECTIONS}). ` +
        `Likely blocked or truncated — refusing to write a partial corpus.`,
    );
  }

  const corpus = {
    _source: "Official BNS 2023 via indiacode.nic.in (verbatim section text).",
    _generatedFrom: `${BASE}/show-data?actid=${ACTID}`,
    _note:
      "bailable/cognizable/compoundable come from the BNSS First Schedule, not the BNS — fill via the BNSS pass. Punishment is heuristically extracted; the authoritative wording is in 'text'.",
    act: { name: "Bharatiya Nyaya Sanhita, 2023", shortCode: "BNS", jurisdiction: "central" },
    docType: "STATUTE",
    sourceUrl: `${BASE}/handle/123456789/20062`,
    lastAmended: "2023",
    sections,
  };

  const dir = join(process.cwd(), "data", "corpus");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "bns.json"), JSON.stringify(corpus, null, 2), "utf8");
  console.log(`\nDone. Wrote ${sections.length} BNS sections to data/corpus/bns.json`);
}

main().catch((err) => {
  console.error("BNS corpus build failed:", err);
  process.exit(1);
});
