import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  APPLICANT_EXCEL_EXPORT_FIELDS,
  resolveApplicantExcelExportFields,
  sanitizeApplicantExcelFilenamePart,
} from "@/lib/applications/applicant-excel-export-fields";
import { buildExcelWorkbook } from "@/lib/excel-export/build-workbook";
import { ymdFileStamp } from "@/lib/excel-export/filename";
import { requireOrganizerForEvent } from "@/lib/permissions";
import type { EventArchiveApplicantsSnapshot } from "@/lib/event-archive/types";
import { eventArchiveService } from "@/lib/services/event-archive.service";

export const eventArchiveApplicantExcelService = {
  async buildWorkbookFromArchive(
    actor: ActorContext,
    eventId: string,
    fieldKeys: string[],
  ): Promise<{ buffer: Buffer; filename: string; rowCount: number }> {
    await requireOrganizerForEvent(actor, eventId);
    const archive = await eventArchiveService.requireActiveArchive(actor, eventId);

    const fields = resolveApplicantExcelExportFields(fieldKeys);
    if (fields.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "최소 1개 이상의 항목을 선택해주세요.",
      );
    }
    const unknown = fieldKeys.filter(
      (k) => !APPLICANT_EXCEL_EXPORT_FIELDS.some((f) => f.key === k),
    );
    if (unknown.length > 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "유효하지 않은 다운로드 항목입니다.",
      );
    }

    const applicants = archive.applicantsSnapshot as EventArchiveApplicantsSnapshot;
    const rows = applicants.rows;
    if (rows.length === 0) {
      throw new AppError("VALIDATION_ERROR", "다운로드할 신청자가 없습니다.");
    }

    const buffer = await buildExcelWorkbook({
      sheetName: "신청자",
      fields,
      rows,
    });
    const titlePart = sanitizeApplicantExcelFilenamePart(
      archive.eventSnapshot.title || "대회",
    );
    const filename = `MATCHON_${titlePart}_신청자_기록_${ymdFileStamp()}.xlsx`;

    return { buffer, filename, rowCount: rows.length };
  },
};
