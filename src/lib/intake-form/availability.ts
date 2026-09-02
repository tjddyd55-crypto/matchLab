import type { IntakeFormStatus } from "@/generated/prisma";
import { formatPublicDate } from "@/lib/date-display";

export type IntakeFormAvailability =
  | { kind: "open" }
  | { kind: "draft"; message: string }
  | { kind: "closed"; message: string }
  | { kind: "not_started"; message: string }
  | { kind: "capacity_full"; message: string };

export function resolveIntakeFormAvailability(input: {
  status: IntakeFormStatus;
  startsAt: Date | null;
  closesAt: Date | null;
  maxSubmissions: number | null;
  activeSubmissionCount: number;
  now?: Date;
}): IntakeFormAvailability {
  const now = input.now ?? new Date();

  if (input.status === "DRAFT") {
    return { kind: "draft", message: "이 신청 폼은 아직 공개되지 않았습니다." };
  }

  if (input.startsAt && now < input.startsAt) {
    const label = formatPublicDate(input.startsAt.toISOString());
    return {
      kind: "not_started",
      message: `아직 신청 기간이 아닙니다. (시작: ${label})`,
    };
  }

  if (input.status === "CLOSED") {
    return { kind: "closed", message: "신청이 마감되었습니다." };
  }

  if (input.closesAt && now > input.closesAt) {
    return { kind: "closed", message: "신청이 마감되었습니다." };
  }

  if (
    input.maxSubmissions != null &&
    input.activeSubmissionCount >= input.maxSubmissions
  ) {
    return {
      kind: "capacity_full",
      message: "정원이 마감되었습니다.",
    };
  }

  return { kind: "open" };
}

export function canSubmitIntakeForm(availability: IntakeFormAvailability): boolean {
  return availability.kind === "open";
}
