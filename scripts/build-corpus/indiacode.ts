/**
 * Generic indiacode.nic.in act scraper. Fetches verbatim official section/article
 * text via the per-section endpoints (no hand-authored law):
 *   show-data?actid=...&orderno=N           → title (Section/Article N) + internal secId
 *   /SectionPageContent?actid=...&sectionID  → JSON { content, footnote } body
 *
 * Run: npm run build:corpus -- <key>     (key: bnss | bsa | constitution)
 *
 * NOTE: BNS is built by scripts/build-corpus/bns.ts and enriched by the BNSS
 * First Schedule pass — do NOT route BNS through here or you'll wipe the merged
 * cognizable/bailable/court values.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://www.indiacode.nic.in";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

interface ActConfig {
  actid: string;
  shortCode: string;
  actName: string;
  jurisdiction: string;
  docType: "STATUTE" | "CONSTITUTION";
  sourceUrl: string;
  label: "Section" | "Article";
  penal: boolean; // extract punishment + offence flags?
  minSections: number;
}

const ACTS: Record<string, ActConfig> = {
  bnss: {
    actid: "AC_CEN_5_23_00049_202346_1719552320687",
    shortCode: "BNSS",
    actName: "Bharatiya Nagarik Suraksha Sanhita, 2023",
    jurisdiction: "central",
    docType: "STATUTE",
    sourceUrl: `${BASE}/handle/123456789/21419`,
    label: "Section",
    penal: false,
    minSections: 500, // BNSS has 531 sections
  },
  bsa: {
    actid: "AC_CEN_5_23_00049_2023-47_1719292804654",
    shortCode: "BSA",
    actName: "Bharatiya Sakshya Adhiniyam, 2023",
    jurisdiction: "central",
    docType: "STATUTE",
    sourceUrl: `${BASE}/handle/123456789/20063`,
    label: "Section",
    penal: false,
    minSections: 160, // BSA has 170 sections
  },
  itact: {
    actid: "AC_CEN_45_76_00001_200021_1517807324077",
    shortCode: "ITA",
    actName: "Information Technology Act, 2000",
    jurisdiction: "central",
    docType: "STATUTE",
    sourceUrl: `${BASE}/handle/123456789/13683`,
    label: "Section",
    penal: true,
    minSections: 80, // ~94 sections incl. amendment insertions
  },
  wages: {
    actid: "AC_CEN_6_0_00035_201929_1608714855550",
    shortCode: "WAGES",
    actName: "Code on Wages, 2019",
    jurisdiction: "central",
    docType: "STATUTE",
    sourceUrl: `${BASE}/handle/123456789/15793`,
    label: "Section",
    penal: true,
    minSections: 60, // 69 sections
  },
  consumer: {
    actid: "AC_CEN_21_44_00007_201935_1596441164903",
    shortCode: "CPA",
    actName: "Consumer Protection Act, 2019",
    jurisdiction: "central",
    docType: "STATUTE",
    sourceUrl: `${BASE}/handle/123456789/15256`,
    label: "Section",
    penal: true,
    minSections: 95, // ~107 sections
  },
  rti: {
    actid: "AC_CEN_26_36_00004_200522_1517807322955",
    shortCode: "RTI",
    actName: "Right to Information Act, 2005",
    jurisdiction: "central",
    docType: "STATUTE",
    sourceUrl: `${BASE}/handle/123456789/2065`,
    label: "Section",
    penal: false,
    minSections: 25, // ~31 sections
  },
  pocso: {
    actid: "AC_CEN_13_14_00005_201232_1517807323686",
    shortCode: "POCSO",
    actName: "Protection of Children from Sexual Offences Act, 2012",
    jurisdiction: "central",
    docType: "STATUTE",
    sourceUrl: `${BASE}/handle/123456789/2079`,
    label: "Section",
    penal: true,
    minSections: 40, // ~46 sections
  },
  dv: {
    actid: "AC_CEN_13_14_00008_200543_1517807325788",
    shortCode: "DV",
    actName: "Protection of Women from Domestic Violence Act, 2005",
    jurisdiction: "central",
    docType: "STATUTE",
    sourceUrl: `${BASE}/handle/123456789/2021`,
    label: "Section",
    penal: false,
    minSections: 30, // ~37 sections
  },
  mv: {
    actid: "AC_CEN_30_42_00009_198859_1517807326286",
    shortCode: "MV",
    actName: "Motor Vehicles Act, 1988",
    jurisdiction: "central",
    docType: "STATUTE",
    sourceUrl: `${BASE}/handle/123456789/1798`,
    label: "Section",
    penal: true,
    minSections: 170, // ~217 sections
  },
  rera: {
    actid: "AC_CEN_17_19_00033_201616_1517807328405",
    shortCode: "RERA",
    actName: "Real Estate (Regulation and Development) Act, 2016",
    jurisdiction: "central",
    docType: "STATUTE",
    sourceUrl: `${BASE}/handle/123456789/18875`,
    label: "Section",
    penal: true,
    minSections: 80, // ~92 sections
  },
  constitution: {
    actid: "__TBD__",
    shortCode: "CONST",
    actName: "Constitution of India",
    jurisdiction: "central",
    docType: "CONSTITUTION",
    sourceUrl: `${BASE}/handle/123456789/15240`,
    label: "Article",
    penal: false,
    minSections: 300, // ~395 articles
  },
};

const MAX_ORDERNO = 700;
const DELAY_MS = 250;
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

const ENT: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " ",
};
function htmlToText(html: string): string {
  return html
    .replace(/\r\n?/g, "\n")
    .replace(/<\/?(br|hr)[^>]*>/gi, "\n")
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&#?\w+;/g, (m) => ENT[m] ?? " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();
}

interface PageMeta {
  number: string | null;
  title: string;
  secId: string | null;
  nextDisabled: boolean;
}

function parsePage(html: string, label: string): PageMeta {
  const titleBlock = html.match(/class="sectionTitle title"[\s\S]*?<\/p>/i)?.[0] ?? "";
  const numRe = new RegExp(`${label}\\s+(\\d+[A-Z]{0,4})\\.`, "i");
  const number = titleBlock.match(numRe)?.[1] ?? null;
  let title = "";
  if (titleBlock) {
    const afterLabel = titleBlock.replace(/[\s\S]*?<\/span>/i, "");
    title = htmlToText(afterLabel.replace(/<span class="pull-right">[\s\S]*/i, ""));
  }
  const secId = html.match(/secId\s*=\s*'(\d+)'/)?.[1] ?? null;
  const nextDisabled =
    /class="disabled"[^>]*>Next</i.test(html) || /<a[^>]*>Next<\/a>/i.test(html) === false;
  return { number, title, secId, nextDisabled };
}

async function fetchBody(actid: string, secId: string): Promise<string> {
  const raw = await fetchText(`${BASE}/SectionPageContent?actid=${actid}&sectionID=${secId}`);
  const json = JSON.parse(raw) as { content?: string };
  return htmlToText(json.content ?? "");
}

function extractPunishment(text: string): string {
  const m = text.match(/shall be punished with[^.]*\./i);
  return m ? m[0].replace(/\s+/g, " ").trim() : "";
}

async function scrape(cfg: ActConfig) {
  if (cfg.actid === "__TBD__") throw new Error(`${cfg.shortCode}: actid not yet resolved.`);
  const sections: Record<string, unknown>[] = [];
  let stop = false;

  for (let orderno = 1; orderno <= MAX_ORDERNO && !stop; orderno++) {
    const html = await fetchText(
      `${BASE}/show-data?actid=${cfg.actid}&orderno=${orderno}&orgactid=${cfg.actid}`,
    );
    const meta = parsePage(html, cfg.label);
    if (meta.number && meta.secId) {
      const text = await fetchBody(cfg.actid, meta.secId);
      sections.push({
        number: meta.number,
        title: meta.title,
        text,
        punishment: cfg.penal ? extractPunishment(text) : "",
        bailable: "NA",
        cognizable: "NA",
        compoundable: "NA",
      });
      if (sections.length % 50 === 0) console.log(`  …${sections.length} (orderno ${orderno})`);
    } else {
      console.log(`  orderno ${orderno}: non-${cfg.label.toLowerCase()} — skipped`);
    }
    if (meta.nextDisabled) stop = true;
    await sleep(DELAY_MS);
  }

  if (sections.length < cfg.minSections) {
    throw new Error(
      `Only ${sections.length} ${cfg.label.toLowerCase()}s collected (expected >= ${cfg.minSections}). ` +
        `Likely blocked or truncated — refusing to write a partial corpus.`,
    );
  }

  const corpus = {
    _source: `Official ${cfg.actName} via indiacode.nic.in (verbatim text).`,
    _generatedFrom: `${BASE}/show-data?actid=${cfg.actid}`,
    act: { name: cfg.actName, shortCode: cfg.shortCode, jurisdiction: cfg.jurisdiction },
    docType: cfg.docType,
    sourceUrl: cfg.sourceUrl,
    sections,
  };
  const dir = join(process.cwd(), "data", "corpus");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${cfg.shortCode.toLowerCase()}.json`);
  writeFileSync(out, JSON.stringify(corpus, null, 2), "utf8");
  console.log(`Done. Wrote ${sections.length} ${cfg.label.toLowerCase()}s → ${out}`);
}

async function main() {
  const key = process.argv[2];
  if (!key || !ACTS[key]) {
    throw new Error(`Usage: build:corpus -- <key>   (one of: ${Object.keys(ACTS).join(", ")})`);
  }
  await scrape(ACTS[key]);
}

main().catch((err) => {
  console.error("Corpus build failed:", err);
  process.exit(1);
});
