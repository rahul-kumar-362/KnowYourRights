/**
 * Build data/corpus/constitution.json from the OFFICIAL Constitution of India
 * PDF (Legislative Department, 2024 edition, via cdnbbsr.s3waas.gov.in).
 *
 * The Constitution is not in indiacode's per-section show-data system, so we
 * parse the official PDF's text layer. Article BODIES are headed
 * "<num>. <Title>.—<text>" (em-dash); the contents/arrangement list uses no
 * em-dash, so matching the em-dash header cleanly excludes the contents list.
 *
 * Run: npm run build:constitution
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PDF_URL =
  "https://cdnbbsr.s3waas.gov.in/s380537a945c7aaa788ccfcdf1b99b5d8f/uploads/2024/07/20240716890312078.pdf";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const RAW = join(process.cwd(), "data", "raw", "coi.pdf");
const OUT = join(process.cwd(), "data", "corpus", "constitution.json");
const MIN_ARTICLES = 250;

async function ensurePdf(): Promise<Uint8Array> {
  if (existsSync(RAW)) return new Uint8Array(readFileSync(RAW));
  mkdirSync(join(process.cwd(), "data", "raw"), { recursive: true });
  const res = await fetch(PDF_URL, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Failed to download Constitution PDF: HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  writeFileSync(RAW, buf);
  return buf;
}

function tidy(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function main() {
  const data = await ensurePdf();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { PDFParse } = (await import("pdf-parse")) as any;
  const parser = new PDFParse({ data });
  const text: string = (await parser.getText()).text;

  // Match article-body headers: "\n<num>. <Title>—" with an em-dash (— U+2014)
  // or the double-hyphen fallback. Capture number + title; body runs to the
  // next header.
  // Optional leading amendment marker (e.g. "2[" before "21A") so articles
  // inserted by amendment (21A, 300A, the 243-/371-series) are captured too.
  const headerRe = /\n\s*(?:\d{1,2}\s*\[\s*)?(\d{1,3}[A-Z]{0,3})\.[ \t]+([^\n—\]]{3,160}?)\s*(?:—|--)/g;
  const heads: { num: string; title: string; start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(text))) {
    heads.push({
      num: m[1],
      title: m[2].replace(/\s+/g, " ").replace(/\.$/, "").trim(),
      start: m.index + m[0].length,
    });
  }

  const seen = new Set<string>();
  const sections: Record<string, unknown>[] = [];
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    if (seen.has(h.num)) continue; // first (body) occurrence wins
    const end = i + 1 < heads.length ? heads[i + 1].start : text.length;
    const body = tidy(text.slice(h.start, end));
    if (body.length < 15) continue; // skip stubs / repealed markers
    seen.add(h.num);
    sections.push({
      number: h.num,
      title: h.title,
      text: body.length > 4000 ? body.slice(0, 4000) : body,
      punishment: "",
      bailable: "NA",
      cognizable: "NA",
      compoundable: "NA",
    });
  }

  if (sections.length < MIN_ARTICLES) {
    throw new Error(
      `Only ${sections.length} articles parsed (expected >= ${MIN_ARTICLES}). ` +
        `Parser/source issue — refusing to write a partial corpus.`,
    );
  }

  const corpus = {
    _source: "Official Constitution of India (Legislative Dept, 2024) — verbatim article text from the PDF text layer.",
    _generatedFrom: PDF_URL,
    _note: "Article bodies parsed from the official PDF; the 12 Schedules are not included. Footnote/amendment markers may appear inline.",
    act: { name: "Constitution of India", shortCode: "CONST", jurisdiction: "central" },
    docType: "CONSTITUTION",
    sourceUrl: "https://www.legislative.gov.in/constitution-of-india",
    sections,
  };
  mkdirSync(join(process.cwd(), "data", "corpus"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(corpus, null, 2), "utf8");
  console.log(`Done. Wrote ${sections.length} articles → ${OUT}`);
}

main().catch((err) => {
  console.error("Constitution build failed:", err);
  process.exit(1);
});
