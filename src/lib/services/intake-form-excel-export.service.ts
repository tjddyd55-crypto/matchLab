import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { buildExcelWorkbook } from "@/lib/excel-export/build-workbook";
import type { ExcelExportField } from "@/lib/excel-export/types";
import { ymdFileStamp, sanitizeExcelFilenamePart } from "@/lib/excel-export/filename";
import { formatIntakeAnswerForDisplay } from "@/lib/intake-form/fields";
import { INTAKE_FORM_SUBMISSION_STATUS_LABEL } from "@/lib/intake-form/ui-labels";
import { formatPublicDate } from "@/lib/date-display";
import { intakeFormRepository } from "@/lib/repositories/intake-form.repository";
import { intakeFormService } from "@/lib/services/intake-form.service";
import type { IntakeFormFieldType } from "@/generated/prisma";

type ExportRow = Record<string, string>;

export const intakeFormExcelExportService = {
  async buildSubmissionsWorkbook(
    actor: ActorContext,
    formId: string,
  ): Promise<{ buffer: Buffer; filename: string; rowCount: number }> {
    const { form, fields } = await intakeFormService.getForOrganizer(
      actor,
      formId,
    );
    const submissions = await intakeFormRepository.listSubmissions(formId);

    const orderedFields = [...fields]
      .filter((f) => f.type !== "static_info")
      .sort(
        (a, b) =>
          a.displayOrder - b.displayOrder ||
          a.stableKey.localeCompare(b.stableKey),
      );

    const fieldsDef: ExcelExportField<string, ExportRow>[] = [
      {
        key: "submittedAt",
        label: "신청일",
        defaultSelected: true,
        extract: (row) => row.submittedAt,
      },
      {
        key: "status",
        label: "상태",
        defaultSelected: true,
        extract: (row) => row.status,
      },
      ...orderedFields.map((f) => ({
        key: f.stableKey,
        label: f.label,
        defaultSelected: true,
        extract: (row: ExportRow) => row[f.stableKey] ?? "",
      })),
    ];

    const rows: ExportRow[] = submissions.map((sub) => {
      const row: ExportRow = {
        submittedAt: formatPublicDate(sub.submittedAt.toISOString()),
        status: INTAKE_FORM_SUBMISSION_STATUS_LABEL[sub.status],
      };
      const answerByKey = new Map<string, unknown>();
      for (const a of sub.answers) {
        const field = orderedFields.find(
          (f) => f.label === a.fieldLabelSnapshot,
        );
        const key = field?.stableKey ?? a.fieldLabelSnapshot;
        answerByKey.set(key, a.valueJson);
      }
      for (const field of orderedFields) {
        row[field.stableKey] = formatIntakeAnswerForDisplay(
          field.type as IntakeFormFieldType,
          answerByKey.get(field.stableKey),
        );
      }
      return row;
    });

    const buffer = await buildExcelWorkbook({
      sheetName: "신청자",
      fields: fieldsDef,
      rows,
    });

    const stamp = ymdFileStamp(new Date());
    const titlePart = sanitizeExcelFilenamePart(form.title);
    return {
      buffer,
      filename: `${titlePart}_신청자_${stamp}.xlsx`,
      rowCount: rows.length,
    };
  },
};
