import type { RetrievedChunk } from "@/types";

/** Render retrieved statute chunks into a numbered block the models cite from. */
export function formatSources(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "(NO SOURCES RETRIEVED — you must not cite any specific section.)";
  }
  return chunks
    .map((c, i) => {
      const flags = [
        c.punishment ? `Punishment: ${c.punishment}` : null,
        c.bailable ? `Bailable: ${c.bailable}` : null,
        c.cognizable ? `Cognizable: ${c.cognizable}` : null,
        c.compoundable ? `Compoundable: ${c.compoundable}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
      return [
        `[Source ${i + 1}] ${c.actShortCode} (${c.actName}) — Section ${c.sectionNumber}: ${c.sectionTitle}`,
        flags ? flags : null,
        c.text,
        c.sourceUrl ? `Source URL: ${c.sourceUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");
}
