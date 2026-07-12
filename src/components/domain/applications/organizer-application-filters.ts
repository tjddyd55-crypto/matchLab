import type { OrganizerApplicationFiltersState } from "@/components/domain/applications/OrganizerApplicationsFilterBar";

export type OrganizerApplicationSummaryFilter =
  | "all"
  | "pending"
  | "approved"
  | "paid"
  | "unpaid"
  | "gym_cancelled"
  | "organizer_cancelled";

export const QUICK_APPLICATION_FILTER_TABS: {
  id: OrganizerApplicationSummaryFilter;
  label: string;
}[] = [
  { id: "all", label: "전체" },
  { id: "pending", label: "미승인" },
  { id: "approved", label: "승인" },
  { id: "paid", label: "입금완료" },
  { id: "unpaid", label: "미입금" },
];

export function summaryFilterToFilters(
  filter: OrganizerApplicationSummaryFilter,
): Pick<OrganizerApplicationFiltersState, "displayStatus" | "paymentDisplay"> {
  switch (filter) {
    case "all":
      return { displayStatus: "all", paymentDisplay: "all" };
    case "pending":
      return { displayStatus: "pending", paymentDisplay: "all" };
    case "approved":
      return { displayStatus: "approved", paymentDisplay: "all" };
    case "paid":
      return { displayStatus: "all", paymentDisplay: "paid" };
    case "unpaid":
      return { displayStatus: "all", paymentDisplay: "unpaid" };
    case "gym_cancelled":
      return { displayStatus: "gym_cancelled", paymentDisplay: "all" };
    case "organizer_cancelled":
      return { displayStatus: "organizer_cancelled", paymentDisplay: "all" };
  }
}

/** 단일 축 필터일 때만 탭/요약 카드와 동기화 */
export function inferSummaryFilter(
  filters: OrganizerApplicationFiltersState,
): OrganizerApplicationSummaryFilter {
  const { displayStatus, paymentDisplay } = filters;
  if (displayStatus === "all" && paymentDisplay === "all") return "all";
  if (displayStatus === "pending" && paymentDisplay === "all") return "pending";
  if (displayStatus === "approved" && paymentDisplay === "all") return "approved";
  if (displayStatus === "all" && paymentDisplay === "paid") return "paid";
  if (displayStatus === "all" && paymentDisplay === "unpaid") return "unpaid";
  if (displayStatus === "gym_cancelled" && paymentDisplay === "all") {
    return "gym_cancelled";
  }
  if (displayStatus === "organizer_cancelled" && paymentDisplay === "all") {
    return "organizer_cancelled";
  }
  return "all";
}
