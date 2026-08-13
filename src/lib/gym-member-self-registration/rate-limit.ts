/**
 * 공개 셀프등록 rate limit — 출석 키오스크와 동일한 in-memory 슬라이딩 윈도우.
 * replica=1 전제. Redis 전환은 후속.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_PER_TOKEN = 20;
const MAX_PER_IP = 30;
const SWEEP_EVERY_HITS = 200;
let hitCounter = 0;

function prune(bucket: Bucket, now: number) {
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);
}

function sweepStale(now: number) {
  for (const [key, bucket] of buckets) {
    prune(bucket, now);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}

function hit(key: string, limit: number, now = Date.now()): boolean {
  hitCounter += 1;
  if (hitCounter % SWEEP_EVERY_HITS === 0) sweepStale(now);
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

export type SelfRegistrationRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function checkGymMemberSelfRegistrationRateLimit(input: {
  tokenHashPrefix: string;
  ip: string;
}): SelfRegistrationRateLimitResult {
  const tokenOk = hit(`t:${input.tokenHashPrefix}`, MAX_PER_TOKEN);
  const ipOk = hit(`ip:${input.ip || "unknown"}`, MAX_PER_IP);
  if (tokenOk && ipOk) return { ok: true };
  return { ok: false, retryAfterSec: 60 };
}

export function resetGymMemberSelfRegistrationRateLimitForTests() {
  buckets.clear();
  hitCounter = 0;
}
