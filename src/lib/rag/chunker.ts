import { createHash } from "node:crypto";
import type { LawChunk, LawChunkPayload } from "@/types";

/** Shape of a seed/ingest corpus file under data/corpus/. */
export interface CorpusFile {
  act: { name: string; shortCode: string; jurisdiction?: string };
  docType?: LawChunkPayload["docType"];
  sourceUrl?: string;
  lastAmended?: string;
  sections: {
    number: string;
    title: string;
    text: string;
    punishment?: string;
    bailable?: string;
    cognizable?: string;
    compoundable?: string;
  }[];
}

export interface ChunkForIngest {
  chunk: LawChunk;
  embedText: string; // richer string actually sent to the embedder
}

const MAX_CHARS = 1600;
const OVERLAP = 200;

/** Deterministic UUID (v5-style) so re-ingesting updates in place, never duplicates. */
function uuidFrom(key: string): string {
  const h = createHash("sha1").update(key).digest("hex").slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function splitLong(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text];
  const parts: string[] = [];
  let start = 0;
  while (start < text.length) {
    parts.push(text.slice(start, start + MAX_CHARS));
    start += MAX_CHARS - OVERLAP;
  }
  return parts;
}

export function chunkCorpusFile(file: CorpusFile): ChunkForIngest[] {
  const { act } = file;
  const jurisdiction = act.jurisdiction ?? "central";
  const docType = file.docType ?? "STATUTE";
  const out: ChunkForIngest[] = [];

  for (const s of file.sections) {
    const parts = splitLong(s.text);
    parts.forEach((part, i) => {
      const key = `${act.shortCode}:${s.number}${parts.length > 1 ? `:${i}` : ""}`;
      const payload: LawChunkPayload = {
        actName: act.name,
        actShortCode: act.shortCode,
        sectionNumber: s.number,
        sectionTitle: s.title,
        text: part,
        punishment: s.punishment,
        bailable: s.bailable,
        cognizable: s.cognizable,
        compoundable: s.compoundable,
        jurisdiction,
        docType,
        sourceUrl: file.sourceUrl,
        lastAmended: file.lastAmended,
      };
      out.push({
        chunk: { id: uuidFrom(key), payload },
        // Embed section number + title + text so exact-section semantics are captured.
        embedText: `${act.shortCode} Section ${s.number} — ${s.title}\n${part}`,
      });
    });
  }

  return out;
}
