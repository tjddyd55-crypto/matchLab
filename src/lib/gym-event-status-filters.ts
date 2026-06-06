import type { GymEventApplicationStatusRowDTO } from "@/lib/services/gym-event-status.service";

export type GymEventStatusSummaryFilter =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "field_pending"
  | "weigh_fail"
  | "weigh_pass"
  | "eligible"
  | "bracket_assigned"
  | "bracket_unassigned";

export function matchesGymEventStatusSummaryFilter(
  row: GymEventApplicationStatusRowDTO,
  filter: GymEventStatusSummaryFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "pending":
      return row.applicationStatus === "pending";
    case "approved":
      return row.applicationStatus === "approved";
    case "rejected":
      return row.applicationStatus === "rejected";
    case "field_pending":
      return (
        row.applicationStatus === "approved" && row.checkInStatus === "pending"
      );
    case "weigh_fail":
      return (
        row.weighInStatus === "fail" || row.weighInStatus === "manual_fail"
      );
    case "weigh_pass":
      return (
        row.weighInStatus === "pass" || row.weighInStatus === "manual_pass"
      );
    case "eligible":
      return row.isEligibleForBracket;
    case "bracket_assigned":
      return row.bracketAssigned;
    case "bracket_unassigned":
      return row.applicationStatus === "approved" && !row.bracketAssigned;
    default:
      return true;
  }
}
