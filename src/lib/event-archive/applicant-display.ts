import {
  getOrganizerApplicationDisplayStatusLabel,
  getOrganizerPaymentDisplayLabel,
  resolveOrganizerApplicationDisplayStatus,
} from "@/lib/application-display-status";
import type { ApplicantExcelExportRow } from "@/lib/applications/applicant-excel-export-fields";
import { formatFighterGenderLabel } from "@/lib/applications/division-fighter-match";
import { formatPublicDateTime } from "@/lib/date-display";
import { formatDivisionMainLabel } from "@/lib/event-division-fields";

/** Archive snapshot 신청자 display label — client/server 공용 */
export function extractApplicantArchiveDisplayLabels(
  row: ApplicantExcelExportRow,
): {
  genderLabel: string;
  statusLabel: string;
  divisionLabel: string;
  paymentLabel: string;
  appliedAtLabel: string;
} {
  const divisionLabel = row.division
    ? formatDivisionMainLabel(row.division)
    : row.divisionLabel?.trim() || "";
  return {
    genderLabel: formatFighterGenderLabel(row.fighterGender ?? ""),
    statusLabel: getOrganizerApplicationDisplayStatusLabel(
      resolveOrganizerApplicationDisplayStatus({
        status: row.applicationStatus,
        cancellationSource: row.cancellationSource,
      }),
    ),
    divisionLabel,
    paymentLabel: getOrganizerPaymentDisplayLabel(row.paymentStatus),
    appliedAtLabel: row.appliedAt ? formatPublicDateTime(row.appliedAt) : "",
  };
}
