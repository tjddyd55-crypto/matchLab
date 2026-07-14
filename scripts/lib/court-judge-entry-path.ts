/**
 * scripts / Playwright 공용 — 서버와 동일한 서명 규칙으로 court judge entry path 생성.
 * server-only 모듈을 import하지 않는다.
 */
import { createHmac } from "node:crypto";

export const STABLE_COURT_REVISION = "0";

export function resolveJudgeQrEntrySecret(): string {
  return (
    process.env.JUDGE_QR_ENTRY_SECRET?.trim() ||
    process.env.JUDGE_SESSION_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "dev-judge-qr-entry-secret"
  );
}

export function createCourtJudgeEntryToken(payload: {
  eventId: string;
  courtId: string;
  target: "score" | "head";
  courtRevision?: string;
}): string {
  const body = {
    eventId: payload.eventId.trim(),
    courtId: payload.courtId.trim(),
    target: payload.target,
    courtRevision: (payload.courtRevision ?? STABLE_COURT_REVISION).trim(),
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", resolveJudgeQrEntrySecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

export function buildCourtJudgeEntryPath(input: {
  eventId: string;
  courtId: string;
  target: "score" | "head";
}): string {
  const token = createCourtJudgeEntryToken(input);
  const params = new URLSearchParams({
    eventId: input.eventId.trim(),
    courtId: input.courtId.trim(),
    token,
    target: input.target,
  });
  return `/judge/entry?${params.toString()}`;
}
