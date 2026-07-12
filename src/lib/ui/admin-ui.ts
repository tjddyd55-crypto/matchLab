import type {
  FighterStatus,
  GymStatus,
  MatchRecordStatus,
  OrganizerStatus,
} from "@/generated/prisma";
import type { ApplicationStatus, PaymentStatus } from "@/lib/enums";
import {
  matchonGridGapClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
  matchonScrollablePillsClass,
  matchonScrollablePillItemClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";
import type { MatchonStatus } from "@/lib/ui/matchon-status";
import {
  applicationStatusKo,
  paymentStatusKo,
} from "@/components/domain/admin/admin-labels";
import {
  resolveApplicationDisplayMatchonStatus,
  resolvePaymentDisplayMatchonStatus,
} from "@/lib/ui/application-ui";

export {
  matchonGridGapClass,
  matchonPageStackClass as adminPageStackClass,
  matchonPageStackClass,
  matchonScrollablePillsClass,
  matchonScrollablePillItemClass,
  matchonSectionTitleClass,
};

export const adminPageContainerClass =
  "mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:py-8 lg:px-8";

export const adminPageTitleClass = matchonPageTitleClass;
export const adminPageDescClass = matchonPageDescClass;

export const adminDesktopTableClass = "hidden overflow-x-auto rounded-xl border md:block";
export const adminMobileListClass = "flex flex-col gap-3 md:hidden";

const ORGANIZER_STATUS_LABELS: Record<OrganizerStatus, string> = {
  pending: "대기",
  active: "활성",
  suspended: "정지",
  archived: "보관",
};

const GYM_STATUS_LABELS: Record<GymStatus, string> = {
  active: "활성",
  suspended: "정지",
  archived: "보관",
};

const FIGHTER_STATUS_LABELS: Record<FighterStatus, string> = {
  active: "활성",
  inactive: "비활성",
  duplicate_review: "중복 검토",
  archived: "보관",
};

const MATCH_RECORD_STATUS_LABELS: Record<MatchRecordStatus, string> = {
  pending: "대기",
  confirmed: "확정",
  corrected: "정정",
  voided: "무효",
};

export function getAdminOrganizerStatusLabel(status: OrganizerStatus): string {
  return ORGANIZER_STATUS_LABELS[status];
}

export function getAdminGymStatusLabel(status: GymStatus): string {
  return GYM_STATUS_LABELS[status];
}

export function getAdminFighterStatusLabel(status: FighterStatus): string {
  return FIGHTER_STATUS_LABELS[status];
}

export function getAdminMatchRecordStatusLabel(status: MatchRecordStatus): string {
  return MATCH_RECORD_STATUS_LABELS[status];
}

export function resolveAdminOrganizerStatusMatchon(
  status: OrganizerStatus,
): MatchonStatus {
  switch (status) {
    case "active":
      return "active";
    case "suspended":
      return "inactive";
    case "pending":
      return "waiting";
    case "archived":
    default:
      return "cancelled";
  }
}

export function resolveAdminGymStatusMatchon(status: GymStatus): MatchonStatus {
  switch (status) {
    case "active":
      return "active";
    case "suspended":
      return "inactive";
    case "archived":
    default:
      return "cancelled";
  }
}

export function resolveAdminFighterStatusMatchon(
  status: FighterStatus,
): MatchonStatus {
  switch (status) {
    case "active":
      return "active";
    case "inactive":
      return "inactive";
    case "duplicate_review":
      return "waiting";
    case "archived":
    default:
      return "cancelled";
  }
}

export function resolveAdminMatchRecordStatusMatchon(
  status: MatchRecordStatus,
): MatchonStatus {
  switch (status) {
    case "confirmed":
      return "completed";
    case "corrected":
      return "in_progress";
    case "voided":
      return "cancelled";
    case "pending":
    default:
      return "waiting";
  }
}

export function resolveAdminApplicationMatchonStatus(
  status: ApplicationStatus,
): MatchonStatus {
  return resolveApplicationDisplayMatchonStatus({
    status,
    cancellationSource: null,
  });
}

export function resolveAdminPaymentMatchonStatus(
  status: PaymentStatus,
): MatchonStatus {
  return resolvePaymentDisplayMatchonStatus(status);
}

export {
  applicationStatusKo,
  paymentStatusKo,
};
