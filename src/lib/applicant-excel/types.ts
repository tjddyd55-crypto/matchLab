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
  weightClass: string;
  weightLimit: string;
  sport: string;
  weightKg: number | null;
  heightCm: number | null;
  rowNumber: string;
  ageNote: string;
  recordText: string;
  careerText: string;
  insuranceRrnMasked: string;
  insuranceConsentLabel: string;
  /** 서버 commit 전용. analyze action 응답에서는 제거한다. */
  insuranceRrnDigits?: string;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  memo: string;
  divisionId: string | null;
  divisionLabel: string;
  identityKey: string;
  decision: ApplicantExcelDecision;
  decisionLabel: string;
  errors: string[];
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
  divisionId: string;
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
