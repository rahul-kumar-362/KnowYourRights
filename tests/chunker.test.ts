import { describe, it, expect } from "vitest";
import { chunkCorpusFile, type CorpusFile } from "@/lib/rag/chunker";

const file: CorpusFile = {
  act: { name: "Test Act", shortCode: "TST" },
  docType: "STATUTE",
  sourceUrl: "https://example.test",
  sections: [{ number: "1", title: "Short title", text: "This is a short section." }],
};

describe("chunkCorpusFile", () => {
  it("produces one chunk per short section with correct payload", () => {
    const chunks = chunkCorpusFile(file);
    expect(chunks).toHaveLength(1);
    const p = chunks[0].chunk.payload;
    expect(p.sectionNumber).toBe("1");
    expect(p.actShortCode).toBe("TST");
    expect(p.sectionTitle).toBe("Short title");
    expect(chunks[0].embedText).toContain("TST Section 1");
  });

  it("generates deterministic UUID ids", () => {
    const a = chunkCorpusFile(file)[0].chunk.id;
    const b = chunkCorpusFile(file)[0].chunk.id;
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("splits very long sections into multiple overlapping chunks", () => {
    const long: CorpusFile = {
      act: { name: "Test Act", shortCode: "TST" },
      sections: [{ number: "2", title: "Long", text: "x ".repeat(2000) }], // ~4000 chars > MAX_CHARS
    };
    const chunks = chunkCorpusFile(long);
    expect(chunks.length).toBeGreaterThan(1);
    // every split keeps the same top-level section number
    expect(chunks.every((c) => c.chunk.payload.sectionNumber === "2")).toBe(true);
  });
});
