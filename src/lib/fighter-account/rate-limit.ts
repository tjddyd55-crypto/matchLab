/**
 * 선수 계정 설정·재설정용 단순 메모리 rate limit.
 * 출석 키오스크용 limiter를 그대로 쓰지 않고, 인증 액션용 키만 분리한다.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_LOGIN_ID_CHECKS_PER_IP = 30;
const MAX_SETUP_COMPLETE_PER_TOKEN = 10;
const MAX_RESET_COMPLETE_PER_TOKEN = 10;

function prune(bucket: Bucket, now: number) {
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);
}

function hit(key: string, limit: number, now = Date.now()): boolean {
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

export type FighterAccountRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function checkFighterLoginIdLookupRateLimit(
  ip: string,
): FighterAccountRateLimitResult {
  const ok = hit(`login-id:${ip || "unknown"}`, MAX_LOGIN_ID_CHECKS_PER_IP);
  return ok ? { ok: true } : { ok: false, retryAfterSec: 60 };
}

export function checkFighterSetupCompleteRateLimit(
  tokenHashPrefix: string,
): FighterAccountRateLimitResult {
  const ok = hit(`setup:${tokenHashPrefix}`, MAX_SETUP_COMPLETE_PER_TOKEN);
  return ok ? { ok: true } : { ok: false, retryAfterSec: 60 };
}

export function checkFighterResetCompleteRateLimit(
  tokenHashPrefix: string,
): FighterAccountRateLimitResult {
  const ok = hit(`reset:${tokenHashPrefix}`, MAX_RESET_COMPLETE_PER_TOKEN);
  return ok ? { ok: true } : { ok: false, retryAfterSec: 60 };
}

/** 테스트용 */
export function resetFighterAccountRateLimitForTests() {
  buckets.clear();
}
