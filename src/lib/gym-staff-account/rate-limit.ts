/**
 * 선생님 계정 설정·재설정용 메모리 rate limit (replica 1 기준).
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

export type GymStaffAccountRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function checkGymStaffLoginIdLookupRateLimit(
  ip: string,
): GymStaffAccountRateLimitResult {
  const ok = hit(`staff-login-id:${ip || "unknown"}`, MAX_LOGIN_ID_CHECKS_PER_IP);
  return ok ? { ok: true } : { ok: false, retryAfterSec: 60 };
}

export function checkGymStaffSetupCompleteRateLimit(
  tokenHashPrefix: string,
): GymStaffAccountRateLimitResult {
  const ok = hit(`staff-setup:${tokenHashPrefix}`, MAX_SETUP_COMPLETE_PER_TOKEN);
  return ok ? { ok: true } : { ok: false, retryAfterSec: 60 };
}

export function checkGymStaffResetCompleteRateLimit(
  tokenHashPrefix: string,
): GymStaffAccountRateLimitResult {
  const ok = hit(`staff-reset:${tokenHashPrefix}`, MAX_RESET_COMPLETE_PER_TOKEN);
  return ok ? { ok: true } : { ok: false, retryAfterSec: 60 };
}

export function resetGymStaffAccountRateLimitForTests() {
  buckets.clear();
}
