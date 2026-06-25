import "server-only";

import { EventStatus } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import {
  buildCourtHeadJudgeUrl,
  buildCourtScoreJudgeUrl,
} from "@/lib/qr-url";
import {
  createCourtJudgeEntryToken,
  parseCourtJudgeEntryToken,
  tokensMatch,
  toCourtRevision,
  type CourtJudgeEntryTarget,
} from "@/lib/judge-qr-entry-token";

export type JudgeQrEntryFailureReason =
  | "missing_token"
  | "missing_event"
  | "missing_court"
  | "token_mismatch"
  | "court_disabled"
  | "event_closed"
  | "wrong_qr_type";

export type JudgeQrEntryQrType = "judge-login" | "court";

const LOG_PREFIX = "[judge-qr-entry]";

const CLOSED_EVENT_STATUSES: EventStatus[] = [
  EventStatus.cancelled,
];

type LogContext = {
  eventId?: string;
  courtId?: string;
  target?: string;
  hasToken?: boolean;
};

function logInfo(step: string, ctx: LogContext): void {
  console.info(`${LOG_PREFIX} ${step}`, ctx);
}

function logError(step: string, reason: JudgeQrEntryFailureReason, ctx: LogContext): void {
  console.error(`${LOG_PREFIX} failed`, { step, reason, ...ctx });
}

export function judgeQrEntryUserMessage(
  reason: JudgeQrEntryFailureReason,
  qrType: JudgeQrEntryQrType,
): { title: string; description: string } {
  const invalidQrLine =
    qrType === "judge-login"
      ? "유효하지 않은 심판 입장 QR입니다."
      : "유효하지 않은 경기장 QR입니다.";

  switch (reason) {
    case "missing_token":
      return {
        title: "QR 오류",
        description: "QR 정보가 누락되었습니다. 운영자에게 QR을 다시 확인해 주세요.",
      };
    case "missing_event":
      return {
        title: "입장할 수 없습니다.",
        description: `${invalidQrLine} 대회 정보를 찾을 수 없습니다.`,
      };
    case "missing_court":
      return {
        title: "입장할 수 없습니다.",
        description: `${invalidQrLine} 경기장 정보를 찾을 수 없습니다.`,
      };
    case "token_mismatch":
      return {
        title: "입장할 수 없습니다.",
        description: "만료되었거나 재발급된 QR입니다. 운영자에게 최신 QR을 요청해 주세요.",
      };
    case "court_disabled":
      return {
        title: "입장할 수 없습니다.",
        description: `${invalidQrLine} 비활성화된 경기장입니다. 운영자에게 QR을 다시 확인해 주세요.`,
      };
    case "event_closed":
      return {
        title: "입장할 수 없습니다.",
        description: "종료되었거나 취소된 대회입니다.",
      };
    case "wrong_qr_type":
      return {
        title: "입장할 수 없습니다.",
        description:
          qrType === "court"
            ? "심판 입장용 QR이 아닙니다. 경기장 QR을 스캔해 주세요."
            : "경기장 QR이 아닙니다. 심판 입장 QR을 스캔해 주세요.",
      };
    default:
      return {
        title: "입장할 수 없습니다.",
        description: invalidQrLine,
      };
  }
}

export type ValidateCourtJudgeEntryInput = {
  eventId?: string | null;
  courtId?: string | null;
  token?: string | null;
  target?: string | null;
};

export type ValidateCourtJudgeEntrySuccess = {
  ok: true;
  eventId: string;
  courtId: string;
  target: CourtJudgeEntryTarget;
  redirectTo: string;
};

export type ValidateCourtJudgeEntryFailure = {
  ok: false;
  reason: JudgeQrEntryFailureReason;
};

export type ValidateCourtJudgeEntryResult =
  | ValidateCourtJudgeEntrySuccess
  | ValidateCourtJudgeEntryFailure;

function parseTarget(value: string | null | undefined): CourtJudgeEntryTarget | null {
  const raw = value?.trim();
  if (raw === "score" || raw === "head") return raw;
  return null;
}

export async function validateCourtJudgeEntry(
  input: ValidateCourtJudgeEntryInput,
): Promise<ValidateCourtJudgeEntryResult> {
  const eventId = input.eventId?.trim() ?? "";
  const courtId = input.courtId?.trim() ?? "";
  const token = input.token?.trim() ?? "";
  const target = parseTarget(input.target);
  const ctx: LogContext = {
    eventId: eventId || undefined,
    courtId: courtId || undefined,
    target: target ?? input.target ?? undefined,
    hasToken: Boolean(token),
  };

  logInfo("start", ctx);

  if (!eventId || !courtId || !token || !target) {
    logError("parsed params", "missing_token", ctx);
    return { ok: false, reason: "missing_token" };
  }

  logInfo("parsed params", ctx);

  const parsedToken = parseCourtJudgeEntryToken(token);
  if (!parsedToken) {
    logError("token compare", "token_mismatch", ctx);
    return { ok: false, reason: "token_mismatch" };
  }

  if (
    parsedToken.eventId !== eventId ||
    parsedToken.courtId !== courtId ||
    parsedToken.target !== target
  ) {
    logError("token compare", "wrong_qr_type", ctx);
    return { ok: false, reason: "wrong_qr_type" };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, status: true },
  });
  if (!event) {
    logError("event lookup", "missing_event", ctx);
    return { ok: false, reason: "missing_event" };
  }
  logInfo("event lookup", ctx);

  if (CLOSED_EVENT_STATUSES.includes(event.status)) {
    logError("event lookup", "event_closed", ctx);
    return { ok: false, reason: "event_closed" };
  }

  const court = await prisma.eventCourt.findUnique({
    where: { id: courtId },
    select: { id: true, eventId: true, isActive: true, updatedAt: true },
  });
  if (!court || court.eventId !== eventId) {
    logError("court lookup", "missing_court", ctx);
    return { ok: false, reason: "missing_court" };
  }
  logInfo("court lookup", ctx);

  if (!court.isActive) {
    logError("court lookup", "court_disabled", ctx);
    return { ok: false, reason: "court_disabled" };
  }

  const expectedToken = createCourtJudgeEntryToken({
    eventId,
    courtId,
    target,
    courtRevision: toCourtRevision(court.updatedAt),
  });

  if (!tokensMatch(expectedToken, token)) {
    logError("token compare", "token_mismatch", ctx);
    return { ok: false, reason: "token_mismatch" };
  }
  logInfo("token compare", ctx);

  logInfo("success", ctx);

  return {
    ok: true,
    eventId,
    courtId,
    target,
    redirectTo:
      target === "head"
        ? `/judge/courts/${courtId}/head`
        : `/judge/courts/${courtId}/score`,
  };
}

export type ValidateJudgeLoginEntryResult =
  | { ok: true; eventId: string; eventTitle: string }
  | { ok: false; reason: JudgeQrEntryFailureReason };

export async function validateJudgeLoginEntry(
  eventIdRaw?: string | null,
): Promise<ValidateJudgeLoginEntryResult> {
  const eventId = eventIdRaw?.trim() ?? "";
  const ctx: LogContext = { eventId: eventId || undefined, hasToken: false };

  logInfo("judge-login start", ctx);

  if (!eventId) {
    return { ok: true, eventId: "", eventTitle: "" };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, status: true },
  });

  if (!event) {
    logError("judge-login event lookup", "missing_event", ctx);
    return { ok: false, reason: "missing_event" };
  }

  if (CLOSED_EVENT_STATUSES.includes(event.status)) {
    logError("judge-login event lookup", "event_closed", ctx);
    return { ok: false, reason: "event_closed" };
  }

  logInfo("judge-login success", ctx);
  return { ok: true, eventId: event.id, eventTitle: event.title };
}

export function buildCourtJudgeEntryPath(
  eventId: string,
  courtId: string,
  courtUpdatedAt: string | Date,
  target: CourtJudgeEntryTarget,
): string {
  const token = createCourtJudgeEntryToken({
    eventId: eventId.trim(),
    courtId: courtId.trim(),
    target,
    courtRevision: toCourtRevision(courtUpdatedAt),
  });
  const params = new URLSearchParams({
    eventId: eventId.trim(),
    courtId: courtId.trim(),
    token,
    target,
  });
  return `/judge/entry?${params.toString()}`;
}

export function buildCourtJudgeQrLinks(
  eventId: string,
  courts: Array<{ id: string; name: string; updatedAt: string }>,
  baseUrl: string,
): import("@/lib/qr-url").CourtJudgeQrLinkVM[] {
  return courts.map((court) => ({
    id: court.id,
    name: court.name,
    scoreEntryUrl: buildCourtScoreJudgeUrl(
      buildCourtJudgeEntryPath(eventId, court.id, court.updatedAt, "score"),
      baseUrl,
    ),
    headEntryUrl: buildCourtHeadJudgeUrl(
      buildCourtJudgeEntryPath(eventId, court.id, court.updatedAt, "head"),
      baseUrl,
    ),
  }));
}
