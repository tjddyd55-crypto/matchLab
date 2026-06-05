import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";

export type FieldStatusSummaryFilter =
  | "all"
  | "checked_in"
  | "pending"
  | "no_show_group"
  | "weigh_in_pass"
  | "weigh_in_fail"
  | "manual_pass"
  | "eligible";

export function matchesFieldStatusSummaryFilter(
  row: FieldStatusRowDTO,
  filter: FieldStatusSummaryFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "checked_in":
      return row.checkInStatus === "checked_in";
    case "pending":
      return row.checkInStatus === "pending";
    case "no_show_group":
      return (
        row.checkInStatus === "no_show" ||
        row.checkInStatus === "withdrawn" ||
        row.checkInStatus === "disqualified"
      );
    case "weigh_in_pass":
      return (
        row.weighInStatus === "pass" || row.weighInStatus === "manual_pass"
      );
    case "weigh_in_fail":
      return (
        row.weighInStatus === "fail" || row.weighInStatus === "manual_fail"
      );
    case "manual_pass":
      return row.weighInStatus === "manual_pass";
    case "eligible":
      return row.isEligibleForBracket;
    default:
      return true;
  }
}

export function checkInSelectValueForFilter(
  filter: FieldStatusSummaryFilter,
): string {
  switch (filter) {
    case "checked_in":
      return "checked_in";
    case "pending":
      return "pending";
    case "no_show_group":
      return "no_show_group";
    default:
      return "all";
  }
}
