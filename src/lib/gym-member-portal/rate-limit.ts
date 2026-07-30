/**
 * 회원 포털 rate limit — 프로세스 메모리 슬라이딩 윈도우.
 *
 * 한계 (완료 보고):
 * - Railway 재시작 시 카운터 초기화
 * - 다중 replica면 인스턴스별 분산 → production numReplicas=1 전제
 * - 공유 Redis/DB rate limiter 전환은 후속
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 10 * 60_000;
const MAX_PER_IP = 10;
const MAX_PER_PHONE = 5;
const MAX_PER_PORTAL = 40;
const FAIL_WINDOW_MS = 10 * 60_000;
const MAX_FAILS = 8;
const SWEEP_EVERY_HITS = 200;
let hitCounter = 0;

function prune(bucket: Bucket, now: number, windowMs: number) {
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
}

function sweepStale(now: number) {
  for (const [key, bucket] of buckets) {
    const windowMs = key.startsWith("fail:") ? FAIL_WINDOW_MS : WINDOW_MS;
    prune(bucket, now, windowMs);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}

function hit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): boolean {
  hitCounter += 1;
  if (hitCounter % SWEEP_EVERY_HITS === 0) sweepStale(now);

  const bucket = buckets.get(key) ?? { timestamps: [] };
  prune(bucket, now, windowMs);
  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return true;
}

export type MemberPortalRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function checkGymMemberPortalRateLimit(input: {
  portalHashPrefix: string;
  ip: string;
  phoneHash: string;
}): MemberPortalRateLimitResult {
  const portalOk = hit(`mp:${input.portalHashPrefix}`, MAX_PER_PORTAL, WINDOW_MS);
  const ipOk = hit(`ip:${input.ip || "unknown"}`, MAX_PER_IP, WINDOW_MS);
  const phoneOk = hit(`p:${input.phoneHash}`, MAX_PER_PHONE, WINDOW_MS);

  if (portalOk && ipOk && phoneOk) return { ok: true };
  return { ok: false, retryAfterSec: 60 };
}

export function recordGymMemberPortalVerifyFailure(input: {
  portalHashPrefix: string;
  phoneHash: string;
}): MemberPortalRateLimitResult {
  const ok = hit(
    `fail:${input.portalHashPrefix}:${input.phoneHash}`,
    MAX_FAILS,
    FAIL_WINDOW_MS,
  );
  if (ok) return { ok: true };
  return { ok: false, retryAfterSec: 60 };
}

export function checkGymMemberPortalActionRateLimit(input: {
  portalHashPrefix: string;
  ip: string;
  sessionIdPrefix: string;
}): MemberPortalRateLimitResult {
  const portalOk = hit(
    `act-mp:${input.portalHashPrefix}`,
    MAX_PER_PORTAL,
    WINDOW_MS,
  );
  const ipOk = hit(`act-ip:${input.ip || "unknown"}`, MAX_PER_IP, WINDOW_MS);
  const sessionOk = hit(`act-s:${input.sessionIdPrefix}`, 30, WINDOW_MS);
  if (portalOk && ipOk && sessionOk) return { ok: true };
  return { ok: false, retryAfterSec: 60 };
}

/** 테스트용 */
export function __resetGymMemberPortalRateLimitForTests() {
  buckets.clear();
  hitCounter = 0;
}
