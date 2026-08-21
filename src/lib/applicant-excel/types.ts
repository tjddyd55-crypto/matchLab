import type { DivisionSelectionType } from "@/lib/applications/division-selection";

export type ApplicantExcelDecision =
  | "create"
  | "skip_existing"
  | "error";

export type ApplicantExcelPreviewRow = {
  excelRow: number;
  fighterName: string;
  gymName: string;
  gender: "male" | "female" | null;
  genderLabel: string;
  birthDate: string;
  ageGroup: string;
  normalizedAgeGroup: string;
  weightClass: string;
  weightLimit: string;
  sport: string;
  weightKg: number | null;
  applicationWeightKg: number | null;
  resolvedWeightClassName: string;
  resolvedWeightLimit: string;
  legacyWeightClass: string;
  categoryStatus: "ok" | "unknown";
  heightCm: number | null;
  rowNumber: string;
  ageNote: string;
  recordText: string;
  careerText: string;
  /** 구조화 전적 snapshot (총전/승/무/패 컬럼 또는 레거시 parser 결과) */
  totalBoutsSnapshot: number | null;
  winsSnapshot: number | null;
  drawsSnapshot: number | null;
  lossesSnapshot: number | null;
  schoolLevelSnapshot: string | null;
  schoolGradeSnapshot: number | null;
  /** 전적 파싱 경고 (레거시 전적 문자열이 있으나 파싱 불확실) */
  recordParseWarning: string | null;
  insuranceRrnMasked: string;
  insuranceConsentLabel: string;
  /** 서버 commit 전용. analyze action 응답에서는 제거한다. */
  insuranceRrnDigits?: string;
  /** commit 시 consent snapshot 생성 여부 (서버 전용) — Excel 경로에서는 설정하지 않음 */
  insuranceConsentAgreed?: boolean;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  memo: string;
  /** REGISTERED일 때만 EventDivision.id. OTHER면 null */
  divisionId: string | null;
  divisionLabel: string;
  divisionSelectionType: DivisionSelectionType | null;
  requestedDivisionText: string | null;
  /** OTHER 등 주최자 체급 확인 필요 */
  reviewRequired: boolean;
  otherDetailText: string;
  identityKey: string;
  decision: ApplicantExcelDecision;
  decisionLabel: string;
  errors: string[];
  warnings: string[];
};

export type ApplicantExcelPreview = {
  fileName: string;
  headerRow: number;
  totalRows: number;
  counts: {
    create: number;
    skipExisting: number;
    error: number;
  };
  gymCounts: Record<string, number>;
  rows: ApplicantExcelPreviewRow[];
};

export type ApplicantExcelExistingIdentity = {
  applicationId: string;
  divisionId: string | null;
  fighterName: string;
  birthDateIso: string;
  gender: string;
  gymName: string;
};

export type ApplicantExcelCommitResult = {
  created: number;
  skipped: number;
  failed: number;
  applicationIds: string[];
};
