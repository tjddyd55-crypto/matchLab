import "server-only";

import ExcelJS from "exceljs";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEvent } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  APPLICANT_EXCEL_EXPORT_FIELDS,
  resolveApplicantExcelExportFields,
  sanitizeApplicantExcelFilenamePart,
  type ApplicantExcelExportRow,
} from "@/lib/applications/applicant-excel-export-fields";
import { resolveApplicationGymDisplayName } from "@/lib/gym/external-registration-placeholder-gym";
import { formatApplicationDivisionLabel } from "@/lib/applications/application-division-label";
import { additionalInfoService } from "@/lib/services/additional-info.service";
import { bracketRepository } from "@/lib/repositories/bracket.repository";
import {
  buildApplicantAssignmentCountMap,
  resolveApplicantAssignmentCount,
} from "@/lib/applications/applicant-list-filters";

export type ApplicantExcelExportScope = "all" | "filtered";

export type ExportOrganizerApplicationsExcelInput = {
  eventId: string;
  fieldKeys: string[];
  scope: ApplicantExcelExportScope;
  /** scope=filtered 일 때 현재 필터 결과 applicationId (순서 유지) */
  applicationIds?: string[];
};

function ymdFileStamp(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toIso(d: Date): string {
  return d.toISOString();
}

export const applicantExcelExportService = {
  async buildWorkbook(
    actor: ActorContext,
    input: ExportOrganizerApplicationsExcelInput,
  ): Promise<{ buffer: Buffer; filename: string; rowCount: number }> {
    await requireOrganizerForEvent(actor, input.eventId);

    const fields = resolveApplicantExcelExportFields(input.fieldKeys);
    if (fields.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "최소 1개 이상의 항목을 선택해주세요.",
      );
    }
    const unknown = input.fieldKeys.filter(
      (k) => !APPLICANT_EXCEL_EXPORT_FIELDS.some((f) => f.key === k),
    );
    if (unknown.length > 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "유효하지 않은 다운로드 항목입니다.",
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
      select: { id: true, title: true },
    });
    if (!event) throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");

    const [dbRows, matchSlots] = await Promise.all([
      prisma.eventApplication.findMany({
        where: { eventId: input.eventId },
        orderBy: [{ appliedAt: "asc" }, { createdAt: "asc" }],
        include: {
          fighter: {
            select: {
              id: true,
              name: true,
              gender: true,
              phone: true,
              birthDate: true,
              guardianPhone: true,
            },
          },
          gym: { select: { id: true, name: true } },
          division: true,
          payments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { depositorName: true },
          },
        },
      }),
      bracketRepository.listActiveMatchFighterSlotsForEvent(input.eventId),
    ]);
    const assignmentCounts = buildApplicantAssignmentCountMap(matchSlots);

    const exportRows: ApplicantExcelExportRow[] = dbRows.map((row) => {
      const snap =
        row.fighterSnapshot &&
        typeof row.fighterSnapshot === "object" &&
        !Array.isArray(row.fighterSnapshot)
          ? (row.fighterSnapshot as Record<string, unknown>)
          : {};
      const fighterName =
        typeof snap.name === "string" ? snap.name : row.fighter.name;
      const gymName = resolveApplicationGymDisplayName({
        gymNameSnapshot: row.gymNameSnapshot,
        gymSnapshot: row.gymSnapshot,
        gymRelationName: row.gym?.name,
      });
      const applicationWeightKg =
        typeof snap.applicationWeightKg === "number" &&
        Number.isFinite(snap.applicationWeightKg)
          ? snap.applicationWeightKg
          : null;
      const mapped = additionalInfoService.mapRowFields({
        additionalInfoStatus: row.additionalInfoStatus,
        additionalInfoCompletedAt: row.additionalInfoCompletedAt,
        additionalInfoRecipientPhone: row.additionalInfoRecipientPhone,
        additionalInfoRecipientMasked: row.additionalInfoRecipientMasked,
        divisionSelectionType: row.divisionSelectionType,
        fighter: {
          birthDate: row.fighter.birthDate,
          phone: row.fighter.phone,
          guardianPhone: row.fighter.guardianPhone,
        },
      });
      const assignmentCount = resolveApplicantAssignmentCount(
        assignmentCounts,
        row.fighter.id,
      );
      return {
        applicationId: row.id,
        gymName,
        fighterName,
        phone: row.fighter.phone,
        fighterGender: row.fighter.gender ?? "",
        birthDate: row.fighter.birthDate,
        division: row.division
          ? {
              sportType: row.division.sportType,
              ruleType: row.division.ruleType,
              gender: row.division.gender,
              ageGroup: row.division.ageGroup,
              weightClass: row.division.weightClass,
              weightClassName: row.division.weightClassName ?? null,
              weightLimitText: row.division.weightLimitText ?? null,
              skillLevel: row.division.skillLevel,
            }
          : null,
        divisionLabel: formatApplicationDivisionLabel({
          division: row.division,
          divisionSelectionType: row.divisionSelectionType,
          requestedDivisionText: row.requestedDivisionText,
        }),
        applicationWeightKg,
        recordText: row.recordText ?? null,
        careerText: row.careerText ?? null,
        paymentStatus: row.paymentStatus,
        applicationStatus: row.status,
        cancellationSource: row.cancellationSource ?? null,
        additionalInfoLabel: mapped.additionalInfoLabel,
        appliedAt: row.appliedAt ? toIso(row.appliedAt) : null,
        depositorName: row.payments[0]?.depositorName ?? null,
        memo: row.memo,
        isAssigned: assignmentCount >= 1,
      };
    });

    let selectedRows = exportRows;
    if (input.scope === "filtered") {
      const ids = input.applicationIds ?? [];
      if (ids.length === 0) {
        throw new AppError(
          "VALIDATION_ERROR",
          "다운로드할 신청자가 없습니다.",
        );
      }
      const byId = new Map(exportRows.map((r) => [r.applicationId, r]));
      const ordered: ApplicantExcelExportRow[] = [];
      for (const id of ids) {
        const row = byId.get(id);
        if (!row) {
          throw new AppError(
            "VALIDATION_ERROR",
            "선택한 신청자 중 이 대회에 없는 항목이 있습니다.",
          );
        }
        ordered.push(row);
      }
      selectedRows = ordered;
    }

    if (selectedRows.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "다운로드할 신청자가 없습니다.",
      );
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "MATCHON";
    const sheet = workbook.addWorksheet("신청자");

    sheet.columns = fields.map((f) => ({
      header: f.label,
      key: f.key,
      width: Math.min(28, Math.max(12, f.label.length + 4)),
    }));

    const phoneColIndex = fields.findIndex((f) => f.key === "phone");
    selectedRows.forEach((row, index) => {
      const values = fields.map((f) => f.extract(row, index + 1));
      const excelRow = sheet.addRow(values);
      if (phoneColIndex >= 0) {
        const cell = excelRow.getCell(phoneColIndex + 1);
        cell.numFmt = "@";
        if (typeof values[phoneColIndex] === "string") {
          cell.value = values[phoneColIndex];
        }
      }
    });

    sheet.getRow(1).font = { bold: true };

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const titlePart = sanitizeApplicantExcelFilenamePart(event.title || "대회");
    const filename = `MATCHON_${titlePart}_신청자_${ymdFileStamp()}.xlsx`;

    return { buffer, filename, rowCount: selectedRows.length };
  },
};
