import { resolveOrganizerApplicationDisplayStatus } from "@/lib/application-display-status";
import type {
  ApplicationCancellationSource,
  ApplicationStatus,
} from "@/generated/prisma";

export type ApplicantExcelCancellationInclude = {
  includeGymCancelled: boolean;
  includeOrganizerCancelled: boolean;
};

export const DEFAULT_APPLICANT_EXCEL_CANCELLATION_INCLUDE: ApplicantExcelCancellationInclude =
  {
    includeGymCancelled: false,
    includeOrganizerCancelled: false,
  };

export type ApplicantExcelExportStatusInput = {
  applicationStatus: ApplicationStatus;
  cancellationSource: ApplicationCancellationSource | null;
};

export type ApplicantExcelExportScopeRow = ApplicantExcelExportStatusInput & {
  applicationId: string;
};

export function shouldIncludeApplicantInExcelExport(
  row: ApplicantExcelExportStatusInput,
  include: ApplicantExcelCancellationInclude,
): boolean {
  const display = resolveOrganizerApplicationDisplayStatus({
    status: row.applicationStatus,
    cancellationSource: row.cancellationSource,
  });
  if (display === "pending" || display === "approved") return true;
  if (display === "gym_cancelled") return include.includeGymCancelled;
  if (display === "organizer_cancelled") {
    return include.includeOrganizerCancelled;
  }
  return false;
}

export function countApplicantsForExcelExport<
  T extends ApplicantExcelExportStatusInput,
>(rows: readonly T[], include: ApplicantExcelCancellationInclude): number {
  return rows.filter((row) => shouldIncludeApplicantInExcelExport(row, include))
    .length;
}
