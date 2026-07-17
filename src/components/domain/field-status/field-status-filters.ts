import type { FieldStatusRowDTO } from "@/lib/services/field-status.service";

export type FieldStatusSummaryFilter =
  | "all"
  | "weigh_pending"
  | "weigh_in_pass"
  | "weigh_in_fail"
  | "handicap_proceed"
  | "match_cancelled"
  | "disqualified"
  | "eligible";

export function matchesFieldStatusSummaryFilter(
  row: FieldStatusRowDTO,
  filter: FieldStatusSummaryFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "weigh_pending":
      return row.weighInStatus === "pending";
    case "weigh_in_pass":
      return (
        row.weighInStatus === "pass" || row.weighInStatus === "manual_pass"
      );
    case "weigh_in_fail":
      return (
        row.weighInStatus === "fail" || row.weighInStatus === "manual_fail"
      );
    case "handicap_proceed":
      return row.weighInFailureResolution === "proceed_with_handicap";
    case "match_cancelled":
      return row.weighInFailureResolution === "cancel_match";
    case "disqualified":
      return (
        row.checkInStatus === "disqualified" ||
        row.checkInStatus === "no_show" ||
        row.checkInStatus === "withdrawn"
      );
    case "eligible":
      return row.isEligibleForBracket;
    default:
      return true;
  }
}

export function matchesFieldStatusSearchQuery(
  row: FieldStatusRowDTO,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    row.fighterName,
    row.gymName,
    row.divisionLabel,
    row.weightClassLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

/** 계체 상태 select ↔ summary filter 동기화 */
export function weighInSelectValueForFilter(
  filter: FieldStatusSummaryFilter,
): string {
  switch (filter) {
    case "weigh_pending":
      return "pending";
    case "weigh_in_pass":
      return "pass";
    case "weigh_in_fail":
      return "fail";
    default:
      return "all";
  }
}
