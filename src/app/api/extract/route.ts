import { NextResponse } from "next/server";
import { extractText, kindFor } from "@/lib/ocr/extract";
import { logger } from "@/lib/logger";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 120; // OCR of a large scan can take a while

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  const rl = rateLimit(`extract:${clientIp(req)}`, 20, 60_000); // 20/min/IP
  if (!rl.ok) return tooMany(rl.retryAfter);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10 MB)." }, { status: 413 });
  }
  if (!kindFor(file.type, file.name)) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF, image, or text file." },
      { status: 400 },
    );
  }

  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const text = await extractText(buf, file.type, file.name);
    if (!text) {
      return NextResponse.json(
        { error: "No text could be extracted (scanned image may be too low quality)." },
        { status: 422 },
      );
    }
    logger.info("extract.success", { name: file.name, chars: text.length });
    return NextResponse.json({ text: text.slice(0, 8000), chars: text.length });
  } catch (err) {
    logger.error("extract.failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Could not read the file." }, { status: 500 });
  }
}
