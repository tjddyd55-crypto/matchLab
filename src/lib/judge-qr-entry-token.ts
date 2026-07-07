import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export type CourtJudgeEntryTarget = "score" | "head";

export type CourtJudgeEntryPayload = {
  eventId: string;
  courtId: string;
  target: CourtJudgeEntryTarget;
  /** URL 호환용 메타. DB updatedAt과 대조하지 않음. */
  courtRevision: string;
};

/** 신규 QR 생성 시 사용. 경기장 이름·순서 변경으로 QR이 바뀌지 않게 한다. */
export const STABLE_COURT_REVISION = "0";

function entrySecret(): string {
  const secret =
    process.env.JUDGE_QR_ENTRY_SECRET?.trim() ||
    process.env.JUDGE_SESSION_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.DATABASE_URL?.trim();

  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    console.error(
      "[judge-qr-entry] stable secret missing — set JUDGE_QR_ENTRY_SECRET in production",
    );
  }

  return "dev-judge-qr-entry-secret";
}

function signPayload(encoded: string): string {
  return createHmac("sha256", entrySecret()).update(encoded).digest("base64url");
}

export function toCourtRevision(updatedAt: string | Date): string {
  const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function createCourtJudgeEntryToken(
  payload: CourtJudgeEntryPayload,
): string {
  const body: CourtJudgeEntryPayload = {
    eventId: payload.eventId.trim(),
    courtId: payload.courtId.trim(),
    target: payload.target,
    courtRevision: payload.courtRevision.trim(),
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = signPayload(encoded);
  return `${encoded}.${sig}`;
}

export function parseCourtJudgeEntryToken(
  token: string,
): CourtJudgeEntryPayload | null {
  const raw = token.trim();
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;

  const encoded = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = signPayload(encoded);

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const body = JSON.parse(json) as CourtJudgeEntryPayload;
    if (
      !body.eventId?.trim() ||
      !body.courtId?.trim() ||
      (body.target !== "score" && body.target !== "head") ||
      !body.courtRevision?.trim()
    ) {
      return null;
    }
    return {
      eventId: body.eventId.trim(),
      courtId: body.courtId.trim(),
      target: body.target,
      courtRevision: body.courtRevision.trim(),
    };
  } catch {
    return null;
  }
}

export function tokensMatch(expected: string, actual: string): boolean {
  const a = expected.trim();
  const b = actual.trim();
  if (!a || !b) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
