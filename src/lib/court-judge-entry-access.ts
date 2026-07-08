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

export async function resolveCourtJudgeEntryAccess(
  input: ResolveCourtJudgeEntryAccessInput,
): Promise<ResolveCourtJudgeEntryAccessResult> {
  const cookieAccess = await assertCourtJudgeEntryAccess(
    input.courtId,
    input.expectedTarget,
  );
  if (cookieAccess.ok) {
    return {
      ok: true,
      eventId: cookieAccess.eventId,
      source: "cookie",
    };
  }

  const queryResult = await validateCourtJudgeEntry({
    eventId: input.searchParams.eventId,
    courtId: input.courtId,
    token: input.searchParams.token,
    target: input.searchParams.target,
  });

  if (!queryResult.ok) {
    return { ok: false, reason: queryResult.reason };
  }

  if (queryResult.target !== input.expectedTarget) {
    return { ok: false, reason: "wrong_qr_type" };
  }

  return {
    ok: true,
    eventId: queryResult.eventId,
    source: "query",
  };
}
