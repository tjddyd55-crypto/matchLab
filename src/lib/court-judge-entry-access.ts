import "server-only";

import { assertCourtJudgeEntryAccess } from "@/lib/court-judge-entry-session";
import type { CourtJudgeEntryTarget } from "@/lib/judge-qr-entry-token";
import {
  validateCourtJudgeEntry,
  type JudgeQrEntryFailureReason,
} from "@/lib/services/judge-qr-entry.service";

export type CourtJudgeEntryAccessSource = "cookie" | "query";

export type ResolveCourtJudgeEntryAccessInput = {
  courtId: string;
  expectedTarget: CourtJudgeEntryTarget;
  searchParams: {
    eventId?: string | null;
    token?: string | null;
    target?: string | null;
  };
};

export type ResolveCourtJudgeEntryAccessSuccess = {
  ok: true;
  eventId: string;
  source: CourtJudgeEntryAccessSource;
};

export type ResolveCourtJudgeEntryAccessFailure = {
  ok: false;
  reason: JudgeQrEntryFailureReason;
};

export type ResolveCourtJudgeEntryAccessResult =
  | ResolveCourtJudgeEntryAccessSuccess
  | ResolveCourtJudgeEntryAccessFailure;

const LOG_PREFIX = "[judge-court-access]";

type AccessLogContext = {
  courtId: string;
  expectedTarget: CourtJudgeEntryTarget;
  hasQueryEventId: boolean;
  hasQueryToken: boolean;
  queryTarget?: string;
  resultSource: "query" | "cookie" | "fail";
  failureReason?: JudgeQrEntryFailureReason;
};

function logAccess(ctx: AccessLogContext): void {
  if (ctx.resultSource === "fail") {
    console.error(`${LOG_PREFIX} access denied`, ctx);
    return;
  }
  console.info(`${LOG_PREFIX} access granted`, ctx);
}

/**
 * QR URL이 명시적으로 주어진 경우(query token) query가 authoritative 하다.
 * stale cookie가 valid query를 덮어쓰거나, invalid query를 cookie로 우회하지 못하게 한다.
 * cookie는 query가 없는 direct/refresh 접근의 보조 수단으로만 사용한다.
 */
export async function resolveCourtJudgeEntryAccess(
  input: ResolveCourtJudgeEntryAccessInput,
): Promise<ResolveCourtJudgeEntryAccessResult> {
  const { courtId, expectedTarget, searchParams } = input;
  const eventId = searchParams.eventId?.trim() ?? "";
  const token = searchParams.token?.trim() ?? "";
  const target = searchParams.target?.trim() ?? "";
  const hasQuery = Boolean(eventId && token && target);

  const baseLog = {
    courtId,
    expectedTarget,
    hasQueryEventId: Boolean(eventId),
    hasQueryToken: Boolean(token),
    queryTarget: target || undefined,
  };

  if (hasQuery) {
    const queryResult = await validateCourtJudgeEntry({
      eventId,
      courtId,
      token,
      target,
    });

    if (!queryResult.ok) {
      logAccess({ ...baseLog, resultSource: "fail", failureReason: queryResult.reason });
      return { ok: false, reason: queryResult.reason };
    }

    if (queryResult.target !== expectedTarget) {
      logAccess({ ...baseLog, resultSource: "fail", failureReason: "wrong_qr_type" });
      return { ok: false, reason: "wrong_qr_type" };
    }

    logAccess({ ...baseLog, resultSource: "query" });
    return { ok: true, eventId: queryResult.eventId, source: "query" };
  }

  const cookieAccess = await assertCourtJudgeEntryAccess(courtId, expectedTarget);
  if (cookieAccess.ok) {
    logAccess({ ...baseLog, resultSource: "cookie" });
    return { ok: true, eventId: cookieAccess.eventId, source: "cookie" };
  }

  logAccess({ ...baseLog, resultSource: "fail", failureReason: "missing_token" });
  return { ok: false, reason: "missing_token" };
}
