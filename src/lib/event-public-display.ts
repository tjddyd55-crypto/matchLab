import { parseISO } from "date-fns";
import type { PublicEventDetailDTO, PublicEventListItemDTO } from "@/lib/dto/public";
import { EventStatus } from "@/lib/enums";
import {
  resolveOrganizerRegistrationStatus,
  type OrganizerRegistrationStatus,
} from "@/lib/event-organizer-status";

/** 공개 페이지 신청 기간 배지 문구 */
export const PUBLIC_REGISTRATION_STATUS_LABELS: Record<
  OrganizerRegistrationStatus,
  string
> = {
  before: "신청 전",
  open: "신청 가능",
  closed: "신청 마감",
  unavailable: "신청 불가",
  unknown: "신청 안내 확인",
};

export type PublicEventDeadlinePhase =
  | "event_finished"
  | "registration_before"
  | "registration_open"
  | "registration_closed";

export type PublicBracketVisibility = "published" | "preparing";

export type PublicResultsVisibility = "published" | "preparing" | "none";

export const PUBLIC_BRACKET_VISIBILITY_LABELS: Record<
  PublicBracketVisibility,
  string
> = {
  published: "대진표 공개",
  preparing: "대진표 준비 중",
};

export const PUBLIC_RESULTS_VISIBILITY_LABELS: Record<
  PublicResultsVisibility,
  string
> = {
  published: "결과 공개",
  preparing: "결과 준비 중",
  none: "결과 없음",
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** KST 기준 달력 일(day) 인덱스 — 서버·클라이언트 동일 규칙 */
export function kstDayIndex(date: Date): number {
  return Math.floor((date.getTime() + KST_OFFSET_MS) / 86_400_000);
}

export function daysUntilKstDay(targetIso: string, now: Date = new Date()): number {
  const target = parseISO(targetIso);
  if (Number.isNaN(target.getTime())) return 0;
  return kstDayIndex(target) - kstDayIndex(now);
}

export type PublicEventDeadlineInput = Pick<
  PublicEventListItemDTO,
  | "status"
  | "registrationStatus"
  | "registrationStartDate"
  | "registrationEndDate"
  | "eventDate"
>;

export function resolvePublicEventDeadlineLabel(
  input: PublicEventDeadlineInput,
  now?: Date,
): string {
  if (input.status === EventStatus.finished) return "대회 종료";
  if (input.status === EventStatus.cancelled) return "대회 취소";

  switch (input.registrationStatus) {
    case "before": {
      const days = daysUntilKstDay(input.registrationStartDate, now);
      if (days <= 0) return "오늘 신청 시작";
      return `신청 시작 D-${days}`;
    }
    case "open": {
      const days = daysUntilKstDay(input.registrationEndDate, now);
      if (days <= 0) return "오늘 마감";
      return `신청 마감 D-${days}`;
    }
    case "closed":
    case "unavailable":
      return "신청 마감";
    default:
      return "신청 안내 확인";
  }
}

export function resolvePublicEventDeadlinePhase(
  input: PublicEventDeadlineInput,
): PublicEventDeadlinePhase {
  if (input.status === EventStatus.finished) return "event_finished";
  if (input.registrationStatus === "before") return "registration_before";
  if (input.registrationStatus === "open") return "registration_open";
  return "registration_closed";
}

export function resolvePublicBracketVisibility(
  hasPublicBrackets: boolean,
): PublicBracketVisibility {
  return hasPublicBrackets ? "published" : "preparing";
}

export function resolvePublicResultsVisibility(input: {
  hasPublicResults: boolean;
  status: PublicEventListItemDTO["status"];
  hasPublicBrackets: boolean;
}): PublicResultsVisibility {
  if (input.hasPublicResults) return "published";
  if (input.status === EventStatus.finished) return "none";
  if (
    input.hasPublicBrackets ||
    input.status === EventStatus.bracket_ready ||
    input.status === EventStatus.ongoing
  ) {
    return "preparing";
  }
  return "none";
}

/** Google Maps 검색 링크 — 사용자 입력은 encodeURIComponent 처리 */
export function buildMapSearchUrl(locationText: string): string | null {
  const query = locationText.trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function formatPublicFeeAmount(feeAmount: number): string {
  return `${feeAmount.toLocaleString("ko-KR")}원`;
}

export type PublicPaymentDisplayInput = {
  feeAmount: number;
  bankName: string | null;
  accountHolder: string | null;
  depositorRule: string | null;
};

/** 공개 페이지용 참가비·입금 안내 문구 — 계좌번호는 정책상 미포함 */
export function buildPublicPaymentDisplayLines(
  payment: PublicPaymentDisplayInput | null,
): string[] {
  if (!payment) {
    return [
      "참가비 및 입금 안내는 주최자 설정에 따라 다릅니다.",
      "주최자 안내에 따라 입금해 주세요.",
      "입금 후 주최자 확인이 완료되면 신청이 승인됩니다.",
    ];
  }

  const lines: string[] = [`참가비: ${formatPublicFeeAmount(payment.feeAmount)}`];

  if (payment.bankName?.trim() && payment.accountHolder?.trim()) {
    lines.push(
      `입금: ${payment.bankName.trim()} · 예금주 ${payment.accountHolder.trim()}`,
    );
  } else if (payment.bankName?.trim()) {
    lines.push(`입금 은행: ${payment.bankName.trim()}`);
  }

  lines.push("주최자 안내에 따라 입금해 주세요.");
  lines.push("입금 후 주최자 확인이 완료되면 신청이 승인됩니다.");

  if (payment.depositorRule?.trim()) {
    lines.push(payment.depositorRule.trim());
  } else {
    lines.push("입금자명은 체육관명 또는 선수명으로 입력해 주세요.");
  }

  return lines;
}

export function resolvePublicRegistrationStatus(input: {
  status: PublicEventListItemDTO["status"];
  registrationStartDate: string;
  registrationEndDate: string;
  now?: Date;
}): OrganizerRegistrationStatus {
  return resolveOrganizerRegistrationStatus({
    status: input.status,
    registrationStartDate: input.registrationStartDate,
    registrationEndDate: input.registrationEndDate,
    now: input.now,
  });
}

/** 공개 표시용 URL만 허용 (http/https). storage path 원문은 사용하지 않음. */
export function isPublicDisplayImageUrl(url: string | null | undefined): url is string {
  if (!url?.trim()) return false;
  const u = url.trim();
  if (!/^https?:\/\//i.test(u)) return false;
  if (u.includes("/object/sign/")) return false;
  return true;
}

export function resolveEventCoverImageUrl(input: {
  posterUrl: string | null;
  galleryImageUrl?: string | null;
}): string | null {
  if (isPublicDisplayImageUrl(input.posterUrl)) return input.posterUrl.trim();
  if (isPublicDisplayImageUrl(input.galleryImageUrl)) {
    return input.galleryImageUrl.trim();
  }
  return null;
}

export function resolveDetailCoverImageUrl(
  event: Pick<PublicEventDetailDTO, "posterUrl" | "galleryImages">,
): string | null {
  return resolveEventCoverImageUrl({
    posterUrl: event.posterUrl,
    galleryImageUrl: event.galleryImages[0]?.imageUrl ?? null,
  });
}

export function primarySportFromDivisions(
  divisions: { sportType: string }[],
): string | null {
  const first = divisions[0]?.sportType?.trim();
  return first || null;
}
