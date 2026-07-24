/**
 * 출석 키오스크 rate limit — 프로세스 메모리 슬라이딩 윈도우.
 *
 * 1차 한계 (완료 보고 필수):
 * - Railway 재시작 시 카운터 초기화
 * - 다중 replica면 인스턴스별 분산 → 현재 production numReplicas=1 전제
 * - 공유 Redis/DB rate limiter로 전환 권장 (후속)
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
/** token당 분당 요청 */
const MAX_PER_TOKEN = 60;
/** IP당 분당 요청 */
const MAX_PER_IP = 40;
/** 전화 hash당 분당 시도 */
const MAX_PER_PHONE = 10;
/** 연속 실패(회원 없음 등) — token+phone 기준 5분 내 8회 */
const FAIL_WINDOW_MS = 5 * 60_000;
const MAX_FAILS = 8;
/** Map 비대화 방지 — 오래된 bucket 정리 주기 */
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

export type AttendanceRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function checkGymAttendanceRateLimit(input: {
  tokenHashPrefix: string;
  ip: string;
  phoneHash: string;
}): AttendanceRateLimitResult {
  const tokenOk = hit(`t:${input.tokenHashPrefix}`, MAX_PER_TOKEN, WINDOW_MS);
  const ipOk = hit(`ip:${input.ip || "unknown"}`, MAX_PER_IP, WINDOW_MS);
  const phoneOk = hit(`p:${input.phoneHash}`, MAX_PER_PHONE, WINDOW_MS);

  if (tokenOk && ipOk && phoneOk) return { ok: true };
  return { ok: false, retryAfterSec: 60 };
}

export function recordGymAttendanceLookupFailure(input: {
  tokenHashPrefix: string;
  phoneHash: string;
}): AttendanceRateLimitResult {
  const key = `fail:${input.tokenHashPrefix}:${input.phoneHash}`;
  const ok = hit(key, MAX_FAILS, FAIL_WINDOW_MS);
  if (ok) return { ok: true };
  return { ok: false, retryAfterSec: 300 };
}

/** 출석 성공 시 해당 phone의 실패 누적 초기화 */
export function clearGymAttendanceLookupFailures(input: {
  tokenHashPrefix: string;
  phoneHash: string;
}) {
  buckets.delete(`fail:${input.tokenHashPrefix}:${input.phoneHash}`);
}

/** 테스트용 */
export function resetGymAttendanceRateLimitForTests() {
  buckets.clear();
  hitCounter = 0;
}
