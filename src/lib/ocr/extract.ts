/**
 * Extract text from an uploaded document — fully local (no API, no quota):
 *   PDF   → pdf-parse text layer
 *   image → tesseract.js OCR (wasm)
 *   text  → decoded as-is
 * The extracted text is shown to the user to review before analysis (grounding
 * stays honest — nothing is silently fabricated from a blurry scan).
 */
export type ExtractKind = "pdf" | "image" | "text";

export function kindFor(mime: string, filename: string): ExtractKind | null {
  const f = filename.toLowerCase();
  if (mime.includes("pdf") || f.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|tiff?)$/.test(f)) return "image";
  if (mime.startsWith("text/") || /\.(txt|md|csv)$/.test(f)) return "text";
  return null;
}

export async function extractText(buf: Uint8Array, mime: string, filename: string): Promise<string> {
  const kind = kindFor(mime, filename);
  if (!kind) throw new Error(`Unsupported file type: ${mime || filename}`);

  if (kind === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buf });
    const r = await parser.getText();
    return r.text.trim();
  }

  if (kind === "image") {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    try {
      const { data } = await worker.recognize(Buffer.from(buf));
      return data.text.trim();
    } finally {
      await worker.terminate();
    }
  }

  return Buffer.from(buf).toString("utf8").trim();
}
