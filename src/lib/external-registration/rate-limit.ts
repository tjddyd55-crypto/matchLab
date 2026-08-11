/**
 * 외부 등록 공개 endpoint rate limit — 프로세스 메모리 슬라이딩 윈도우.
 * Railway numReplicas=1 전제. Redis 전환은 후속.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 10 * 60_000;
const MAX_RESOLVE_PER_IP = 60;
const MAX_SUBMIT_PER_IP = 8;
const MAX_SUBMIT_PER_LINK = 40;
const SWEEP_EVERY = 200;
let hits = 0;

function prune(bucket: Bucket, now: number) {
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);
}

function hit(key: string, limit: number): boolean {
  hits += 1;
  const now = Date.now();
  if (hits % SWEEP_EVERY === 0) {
    for (const [k, b] of buckets) {
      prune(b, now);
      if (b.timestamps.length === 0) buckets.delete(k);
    }
  }
  const bucket = buckets.get(key) ?? { timestamps: [] };
  prune(bucket, now);
  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return true;
}

export type ExternalRegRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function checkExternalRegistrationResolveRateLimit(ip: string): ExternalRegRateLimitResult {
  if (hit(`ext-res-ip:${ip || "unknown"}`, MAX_RESOLVE_PER_IP)) return { ok: true };
  return { ok: false, retryAfterSec: 60 };
}

export function checkExternalRegistrationSubmitRateLimit(input: {
  ip: string;
  linkId: string;
}): ExternalRegRateLimitResult {
  const ipOk = hit(`ext-sub-ip:${input.ip || "unknown"}`, MAX_SUBMIT_PER_IP);
  const linkOk = hit(`ext-sub-link:${input.linkId}`, MAX_SUBMIT_PER_LINK);
  if (ipOk && linkOk) return { ok: true };
  return { ok: false, retryAfterSec: 60 };
}
