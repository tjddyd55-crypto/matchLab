import type { GymDashboardEventItemDTO } from "@/lib/services/event.service";

export type GymEventCardActionLink = {
  href: string;
  label: string;
  external?: boolean;
};

export type GymEventCardActionPlan = {
  primary: GymEventCardActionLink | null;
  secondary: GymEventCardActionLink | null;
  textLink: GymEventCardActionLink | null;
  disabledPrimaryLabel: string | null;
  fieldStatusLink: GymEventCardActionLink | null;
};

function publicAnnouncementHref(slug: string): string {
  return `/events/${slug}`;
}

/**
 * 체육관 대회 카드 CTA 우선순위.
 * Primary 1 + Secondary 1 + (선택) text link / field compact link.
 */
export function resolveGymEventCardActions(
  event: Pick<
    GymDashboardEventItemDTO,
    | "id"
    | "publicSlug"
    | "canApply"
    | "gymApplicationCount"
    | "registrationStatus"
    | "registrationStatusLabel"
    | "status"
  >,
): GymEventCardActionPlan {
  const applyHref = `/gym/events/${event.id}/apply`;
  const statusHref = `/gym/events/${event.id}/status`;
  const publicHref = publicAnnouncementHref(event.publicSlug);
  const fieldHref = `/gym/events/${event.id}/field-status`;
  const hasApps = event.gymApplicationCount > 0;
  const publicLink: GymEventCardActionLink = {
    href: publicHref,
    label: "공개 공고 보기",
    external: true,
  };
  const fieldLink: GymEventCardActionLink | null = hasApps
    ? { href: fieldHref, label: "현장/계체 상태" }
    : null;

  if (event.canApply && !hasApps) {
    return {
      primary: { href: applyHref, label: "선수 신청하기" },
      secondary: publicLink,
      textLink: null,
      disabledPrimaryLabel: null,
      fieldStatusLink: null,
    };
  }

  if (event.canApply && hasApps) {
    return {
      primary: { href: statusHref, label: "신청 현황" },
      secondary: { href: applyHref, label: "선수 추가 신청" },
      textLink: publicLink,
      disabledPrimaryLabel: null,
      fieldStatusLink: fieldLink,
    };
  }

  if (hasApps) {
    return {
      primary: { href: statusHref, label: "신청 현황" },
      secondary: publicLink,
      textLink: null,
      disabledPrimaryLabel: null,
      fieldStatusLink: fieldLink,
    };
  }

  return {
    primary: null,
    secondary: publicLink,
    textLink: null,
    disabledPrimaryLabel: resolveClosedApplyLabel(event),
    fieldStatusLink: null,
  };
}

function resolveClosedApplyLabel(
  event: Pick<
    GymDashboardEventItemDTO,
    "registrationStatus" | "registrationStatusLabel" | "status"
  >,
): string {
  if (event.registrationStatus === "before") return "신청 전";
  if (event.registrationStatus === "closed") return "신청 마감";
  if (event.status === "finished") return "대회 종료";
  if (event.status === "ongoing") return "대회 진행 중";
  if (event.registrationStatusLabel === "입금 설정 필요") {
    return "입금 설정 필요";
  }
  if (event.registrationStatusLabel === "경기구분 설정 필요") {
    return "경기구분 설정 필요";
  }
  if (event.registrationStatusLabel === "신청 불가") {
    return "신청 마감";
  }
  return event.registrationStatusLabel || "신청 마감";
}
