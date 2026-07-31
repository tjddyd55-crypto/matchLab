/**
 * MATCHON Manager 공개 문의 rate limit (in-memory).
 *
 * 한계:
 * - process 메모리 기반 → replica=1에서만 정확히 동작
 * - 재시작 시 초기화
 * - 다중 replica 시 Redis/shared limiter 필요
 *
 * key에는 원문 contact/message/IP를 저장하지 않고 SHA-256 hash만 사용한다.
 */

import { createHash } from "node:crypto";

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

const IP_WINDOW_MS = 10 * 60_000;
const IP_LIMIT = 5;
const CONTACT_WINDOW_MS = 30 * 60_000;
const CONTACT_LIMIT = 3;
const PAYLOAD_WINDOW_MS = 10 * 60_000;
const PAYLOAD_LIMIT = 1;

function sha256Prefix(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function prune(bucket: Bucket, now: number, windowMs: number) {
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
}

function hit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { ok: true } | { ok: false; retryAfterSec: number } {
  const bucket = buckets.get(key) ?? { timestamps: [] };
  prune(bucket, now, windowMs);
  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((windowMs - (now - oldest)) / 1000),
    );
    return { ok: false, retryAfterSec };
  }
  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { ok: true };
}

export type DesktopSupportInquiryRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number; reason: "ip" | "contact" | "payload" };

export function checkDesktopSupportInquiryRateLimit(input: {
  ip: string;
  contactNormalized: string;
  category: string;
  messageNormalized: string;
}): DesktopSupportInquiryRateLimitResult {
  const ipHash = sha256Prefix(`ip:${input.ip || "unknown"}`);
  const contactHash = sha256Prefix(`contact:${input.contactNormalized}`);
  const payloadHash = sha256Prefix(
    `payload:${input.category}|${input.contactNormalized}|${input.messageNormalized}`,
  );

  const ipHit = hit(`dsi:ip:${ipHash}`, IP_LIMIT, IP_WINDOW_MS);
  if (!ipHit.ok) {
    return { ok: false, retryAfterSec: ipHit.retryAfterSec, reason: "ip" };
  }

  const contactHit = hit(
    `dsi:contact:${contactHash}`,
    CONTACT_LIMIT,
    CONTACT_WINDOW_MS,
  );
  if (!contactHit.ok) {
    return {
      ok: false,
      retryAfterSec: contactHit.retryAfterSec,
      reason: "contact",
    };
  }

  const payloadHit = hit(
    `dsi:payload:${payloadHash}`,
    PAYLOAD_LIMIT,
    PAYLOAD_WINDOW_MS,
  );
  if (!payloadHit.ok) {
    return {
      ok: false,
      retryAfterSec: payloadHit.retryAfterSec,
      reason: "payload",
    };
  }

  return { ok: true };
}

/** 테스트용 */
export function __resetDesktopSupportInquiryRateLimitForTests() {
  buckets.clear();
}
