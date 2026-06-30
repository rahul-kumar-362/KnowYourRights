/**
 * Simple in-memory sliding-window rate limiter (per key). Zero-infra; state is
 * per-process, which is correct for a single Node host / dev. For multi-instance
 * serverless, back this with Redis (ioredis is already a dependency) keyed the
 * same way — the call sites don't change.
 */
const buckets = new Map<string, number[]>();

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfter: number; // seconds
}

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - hits[0])) / 1000);
    buckets.set(key, hits);
    return { ok: false, remaining: 0, retryAfter };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, remaining: limit - hits.length, retryAfter: 0 };
}

/** Best-effort client IP from proxy headers (falls back to a constant). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "local";
}

/** Build a 429 Response body + Retry-After header. */
export function tooMany(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
    { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) } },
  );
}
