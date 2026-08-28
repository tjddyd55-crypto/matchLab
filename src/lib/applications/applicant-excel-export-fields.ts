/**
 * 신청자 Excel export field registry — UI label/순서 SSOT.
 * Dialog checkbox · Excel header · value extractor 가 동일 배열을 사용한다.
 */
import {
  getOrganizerApplicationDisplayStatusLabel,
  getOrganizerPaymentDisplayLabel,
  resolveOrganizerApplicationDisplayStatus,
} from "@/lib/application-display-status";
import { formatFighterGenderLabel } from "@/lib/applications/division-fighter-match";
import { formatUtcDateOnly } from "@/lib/date-only";
import { formatPublicDateTime } from "@/lib/date-display";
import {
  formatDivisionMainLabel,
  type EventDivisionDisplayInput,
} from "@/lib/event-division-fields";
import { MATCH_CATEGORY_WITH_WEIGHT_LABEL } from "@/lib/ui-labels/match-category";
import type {
  ApplicationCancellationSource,
  ApplicationStatus,
  PaymentStatus,
} from "@/generated/prisma";

export type ApplicantExcelExportRow = {
  applicationId: string;
  gymName: string;
  fighterName: string;
  phone: string | null;
  fighterGender: string;
  birthDate: Date | string | null;
  division: EventDivisionDisplayInput | null;
  divisionLabel: string;
  applicationWeightKg: number | null;
  recordText: string | null;
  careerText: string | null;
  paymentStatus: PaymentStatus;
  applicationStatus: ApplicationStatus;
  cancellationSource: ApplicationCancellationSource | null;
  additionalInfoLabel: string;
  appliedAt: string | null;
  depositorName: string | null;
  memo: string | null;
  isAssigned: boolean;
};

export type ApplicantExcelExportFieldKey =
  | "sequence"
  | "gymName"
  | "fighterName"
  | "phone"
  | "gender"
  | "birthDate"
  | "division"
  | "applicationWeightKg"
  | "recordText"
  | "careerText"
  | "paymentStatus"
  | "applicationStatus"
  | "additionalInfo"
  | "appliedAt"
  | "depositorName"
  | "memo"
  | "assignment";

export type ApplicantExcelExportField = {
  key: ApplicantExcelExportFieldKey;
  /** 신청자 관리 UI와 동일한 표시명 */
  label: string;
  defaultSelected: boolean;
  extract: (row: ApplicantExcelExportRow, sequence: number) => string;
};

function formatDivisionCell(row: ApplicantExcelExportRow): string {
  if (row.division) {
    const main = formatDivisionMainLabel(row.division);
    if (main.trim()) return main;
  }
  return row.divisionLabel?.trim() || "";
}

function formatWeightKg(kg: number | null): string {
  if (kg == null || !Number.isFinite(kg)) return "";
  return String(kg);
}

/**
 * UI 업무 컬럼 순서 SSOT.
 * 리스트(순번→체육관→선수명→경기구분/체급→입금→상태→추가정보)를 우선하고
 * 상세에만 있는 연락처·생년월일·전적 등을 자연스럽게 끼운다.
 */
export const APPLICANT_EXCEL_EXPORT_FIELDS: readonly ApplicantExcelExportField[] =
  [
    {
      key: "sequence",
      label: "순번",
      defaultSelected: false,
      extract: (_row, sequence) => String(sequence),
    },
    {
      key: "gymName",
      label: "체육관",
      defaultSelected: true,
      extract: (row) => row.gymName ?? "",
    },
    {
      key: "fighterName",
      label: "선수명",
      defaultSelected: true,
      extract: (row) => row.fighterName ?? "",
    },
    {
      key: "phone",
      label: "연락처",
      defaultSelected: true,
      extract: (row) => {
        const phone = (row.phone ?? "").trim();
        if (!phone || phone === "-") return "";
        return phone;
      },
    },
    {
      key: "gender",
      label: "성별",
      defaultSelected: true,
      extract: (row) => formatFighterGenderLabel(row.fighterGender ?? ""),
    },
    {
      key: "birthDate",
      label: "생년월일",
      defaultSelected: true,
      extract: (row) =>
        row.birthDate ? formatUtcDateOnly(row.birthDate, ".") : "",
    },
    {
      key: "division",
      label: MATCH_CATEGORY_WITH_WEIGHT_LABEL,
      defaultSelected: true,
      extract: (row) => formatDivisionCell(row),
    },
    {
      key: "applicationWeightKg",
      label: "신청체중",
      defaultSelected: true,
      extract: (row) => formatWeightKg(row.applicationWeightKg),
    },
    {
      key: "recordText",
      label: "전적",
      defaultSelected: true,
      extract: (row) => row.recordText?.trim() ?? "",
    },
    {
      key: "careerText",
      label: "운동경력",
      defaultSelected: false,
      extract: (row) => row.careerText?.trim() ?? "",
    },
    {
      key: "paymentStatus",
      label: "입금내역",
      defaultSelected: true,
      extract: (row) => getOrganizerPaymentDisplayLabel(row.paymentStatus),
    },
    {
      key: "applicationStatus",
      label: "상태",
      defaultSelected: true,
      extract: (row) =>
        getOrganizerApplicationDisplayStatusLabel(
          resolveOrganizerApplicationDisplayStatus({
            status: row.applicationStatus,
            cancellationSource: row.cancellationSource,
          }),
        ),
    },
    {
      key: "additionalInfo",
      label: "추가정보",
      defaultSelected: false,
      extract: (row) => row.additionalInfoLabel ?? "",
    },
    {
      key: "appliedAt",
      label: "신청일",
      defaultSelected: true,
      extract: (row) =>
        row.appliedAt ? formatPublicDateTime(row.appliedAt) : "",
    },
    {
      key: "depositorName",
      label: "입금자명",
      defaultSelected: false,
      extract: (row) => row.depositorName?.trim() ?? "",
    },
    {
      key: "memo",
      label: "메모",
      defaultSelected: false,
      extract: (row) => row.memo?.trim() ?? "",
    },
    {
      key: "assignment",
      label: "대진배정",
      defaultSelected: false,
      extract: (row) => (row.isAssigned ? "대진완료" : "미배정"),
    },
  ] as const;

export const APPLICANT_EXCEL_EXPORT_FIELD_KEYS =
  APPLICANT_EXCEL_EXPORT_FIELDS.map((f) => f.key);

export function resolveApplicantExcelExportFields(
  selectedKeys: readonly string[],
): ApplicantExcelExportField[] {
  const selected = new Set(selectedKeys);
  return APPLICANT_EXCEL_EXPORT_FIELDS.filter((f) => selected.has(f.key));
}

export function defaultApplicantExcelExportFieldKeys(): ApplicantExcelExportFieldKey[] {
  return APPLICANT_EXCEL_EXPORT_FIELDS.filter((f) => f.defaultSelected).map(
    (f) => f.key,
  );
}

export function sanitizeApplicantExcelFilenamePart(raw: string): string {
  return raw
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}
