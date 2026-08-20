import { formatUtcDateOnly } from "@/lib/date-only";
import { parseApplicationWeightKg } from "@/lib/applications/application-weight";
import { resolveEventDivisionByApplicationWeight } from "@/lib/applications/resolve-event-division";
import {
  birthDateToUtc,
  compactText,
  foldKey,
  genderLabel,
  parseApplicantBirthDate,
  parseApplicantGender,
  parseOptionalHeightCm,
} from "@/lib/applicant-excel/normalize";
import type { ApplicantDivisionCandidate } from "@/lib/applicant-excel/match-division";
import type { ParsedApplicantExcelRow } from "@/lib/applicant-excel/parse";
import { parseOptionalExcelInsuranceConsent } from "@/lib/athlete-application/insurance-consent";
import { parseOptionalResidentRegistrationNumber } from "@/lib/athlete-application/resident-registration-number";
import type {
  ApplicantExcelExistingIdentity,
  ApplicantExcelPreview,
  ApplicantExcelPreviewRow,
} from "@/lib/applicant-excel/types";
import {
  parseRecordText,
  buildRecordText,
  validateRecord,
  type StructuredRecord,
} from "@/lib/fighter/record";

export function applicantIdentityKey(input: {
  fighterName: string;
  birthDateIso: string;
  gender: string;
  gymName: string;
  divisionId: string;
}): string {
  return [
    foldKey(input.fighterName),
    input.birthDateIso,
    foldKey(input.gender),
    foldKey(input.gymName),
    input.divisionId,
  ].join("|");
}

function existingKey(row: ApplicantExcelExistingIdentity): string {
  return applicantIdentityKey({
    fighterName: row.fighterName,
    birthDateIso: row.birthDateIso,
    gender: row.gender,
    gymName: row.gymName,
    divisionId: row.divisionId,
  });
}

function gymNameFromSnapshot(snapshot: unknown): string {
  if (!snapshot || typeof snapshot !== "object") return "";
  const name = (snapshot as { name?: unknown }).name;
  return typeof name === "string" ? name : "";
}

export function identityFromExistingApplication(row: {
  id: string;
  divisionId: string;
  gymSnapshot: unknown;
  fighter: { name: string; birthDate: Date | null; gender: string };
}): ApplicantExcelExistingIdentity {
  return {
    applicationId: row.id,
    divisionId: row.divisionId,
    fighterName: row.fighter.name,
    birthDateIso: row.fighter.birthDate
      ? formatUtcDateOnly(row.fighter.birthDate, "-")
      : "",
    gender: row.fighter.gender,
    gymName: gymNameFromSnapshot(row.gymSnapshot),
  };
}

function analyzeOneRow(
  parsed: ParsedApplicantExcelRow,
  divisions: ApplicantDivisionCandidate[],
): ApplicantExcelPreviewRow {
  const v = parsed.values;
  const errors: string[] = [];
  const warnings: string[] = [];
  const fighterName = compactText(v.선수명);
  const gymName = compactText(v.체육관명);
  const ageGroup = compactText(v.경기구분);
  const legacyWeightClass = compactText(v.체급);
  const legacyWeightLimit = compactText(v.체중기준);
  const sport = compactText(v.종목);
  const phone = compactText(v.연락처);
  const guardianName = compactText(v.보호자이름);
  const guardianPhone = compactText(v.보호자연락처);
  const memo = compactText(v.메모);
  const rowNumber = compactText(v.번호);
  const ageNote = compactText(v.나이);
  const recordTextRaw = compactText(v.전적);
  const careerText = compactText(v.운동경력);

  // 구조화 전적: 신규 컬럼(총전/승/무/패) SSOT, 없으면 레거시 전적 문자열 파싱
  const structuredRecord = resolveStructuredRecord(v, recordTextRaw);
  const recordText = structuredRecord.recordText;
  if (structuredRecord.warning) {
    errors.push(structuredRecord.warning);
  }
  const rrnParsed = parseOptionalResidentRegistrationNumber(v.주민등록번호);
  const consentParsed = parseOptionalExcelInsuranceConsent(v["보험가입 개인정보동의"]);
  if (!rrnParsed.ok) errors.push(rrnParsed.error);
  if (!consentParsed.ok) errors.push(consentParsed.error);

  if (!fighterName) errors.push("선수명이 없습니다.");
  if (!gymName) errors.push("체육관명이 없습니다.");
  if (!ageGroup) errors.push("경기구분이 없습니다.");

  const genderParsed = parseApplicantGender(v.성별);
  if (!genderParsed.ok) errors.push("성별을 남/여로 입력해 주세요.");
  const birthDate = parseApplicantBirthDate(v.생년월일);
  const weight = parseApplicationWeightKg(v.신청체중);
  if (!weight.ok) errors.push(weight.error);
  const height = parseOptionalHeightCm(v.키);
  if (!height.ok) errors.push(height.error ?? "키가 올바르지 않습니다.");

  let divisionId: string | null = null;
  let divisionLabel = "";
  let resolvedWeightClassName = "";
  let resolvedWeightLimit = "";
  let normalizedAgeGroup = "";
  let categoryStatus: "ok" | "unknown" = "unknown";
  let schoolLevelSnapshot: string | null = null;
  let schoolGradeSnapshot: number | null = null;

  if (genderParsed.ok && ageGroup && weight.ok) {
    const resolved = resolveEventDivisionByApplicationWeight({
      gender: genderParsed.gender,
      competitionCategory: ageGroup,
      discipline: sport,
      applicationWeightKg: weight.kg,
      divisions,
    });
    categoryStatus = resolved.category.status;
    normalizedAgeGroup = resolved.category.displayLabel;
    schoolLevelSnapshot = resolved.category.schoolLevel;
    schoolGradeSnapshot = resolved.category.schoolGrade;
    if (resolved.ok) {
      divisionId = resolved.division.id;
      divisionLabel = resolved.division.label;
      resolvedWeightClassName = resolved.division.weightClassName ?? "";
      resolvedWeightLimit = resolved.division.weightLimitText ?? "";
      if (legacyWeightClass) {
        const legacyFold = foldKey(legacyWeightClass);
        const autoFold = foldKey(resolvedWeightClassName);
        const same =
          legacyFold &&
          autoFold &&
          (legacyFold === autoFold ||
            legacyFold.includes(autoFold) ||
            autoFold.includes(legacyFold));
        if (legacyFold && autoFold && !same) {
          warnings.push(
            `기존 입력 체급: ${legacyWeightClass} → 자동배정: ${resolvedWeightClassName}`,
          );
        }
      }
    } else {
      errors.push(resolved.reason);
    }
  }

  const identityKey =
    fighterName && birthDate && genderParsed.ok && gymName && divisionId
      ? applicantIdentityKey({
          fighterName,
          birthDateIso: birthDate,
          gender: genderParsed.gender,
          gymName,
          divisionId,
        })
      : `row:${parsed.excelRow}`;

  const hasError = errors.length > 0;
  return {
    excelRow: parsed.excelRow,
    fighterName,
    gymName,
    gender: genderParsed.ok ? genderParsed.gender : null,
    genderLabel: genderParsed.ok
      ? genderLabel(genderParsed.gender)
      : compactText(v.성별),
    birthDate: birthDate ?? compactText(v.생년월일),
    ageGroup,
    normalizedAgeGroup,
    weightClass: resolvedWeightClassName || legacyWeightClass,
    weightLimit: resolvedWeightLimit || legacyWeightLimit,
    sport,
    weightKg: weight.ok ? weight.kg : null,
    applicationWeightKg: weight.ok ? weight.kg : null,
    resolvedWeightClassName,
    resolvedWeightLimit,
    legacyWeightClass,
    categoryStatus,
    heightCm: height.cm,
    rowNumber,
    ageNote,
    recordText,
    careerText,
    insuranceRrnMasked: rrnParsed.ok && rrnParsed.digits ? rrnParsed.masked : "",
    insuranceConsentLabel:
      consentParsed.ok && consentParsed.agreed
        ? "동의"
        : compactText(v["보험가입 개인정보동의"]) || "미입력",
    insuranceRrnDigits:
      rrnParsed.ok && rrnParsed.digits ? rrnParsed.digits : undefined,
    insuranceConsentAgreed:
      consentParsed.ok && consentParsed.agreed ? true : undefined,
    phone,
    guardianName,
    guardianPhone,
    memo,
    divisionId,
    divisionLabel,
    identityKey,
    decision: hasError ? "error" : "create",
    decisionLabel: hasError ? "오류" : "등록 가능",
    errors,
    warnings,
    totalBoutsSnapshot: structuredRecord.record?.totalBouts ?? null,
    winsSnapshot: structuredRecord.record?.wins ?? null,
    drawsSnapshot: structuredRecord.record?.draws ?? null,
    lossesSnapshot: structuredRecord.record?.losses ?? null,
    schoolLevelSnapshot,
    schoolGradeSnapshot,
    recordParseWarning: structuredRecord.warning ?? null,
  };
}

export function analyzeApplicantExcelRows(input: {
  fileName: string;
  headerRow: number;
  rows: ParsedApplicantExcelRow[];
  divisions: ApplicantDivisionCandidate[];
  existing: ApplicantExcelExistingIdentity[];
}): ApplicantExcelPreview {
  const existingSet = new Set(input.existing.map(existingKey));
  const seen = new Map<string, number>();
  const rows = input.rows.map((row) => analyzeOneRow(row, input.divisions));

  for (const row of rows) {
    if (row.decision === "error") continue;
    const prev = seen.get(row.identityKey);
    if (prev != null) {
      row.decision = "error";
      row.decisionLabel = "오류";
      row.errors.push(`${prev}행과 파일 내 중복입니다.`);
      continue;
    }
    seen.set(row.identityKey, row.excelRow);
    if (existingSet.has(row.identityKey)) {
      row.decision = "skip_existing";
      row.decisionLabel = "이미 등록";
    }
  }

  const gymCounts: Record<string, number> = {};
  for (const row of rows) {
    const gym = row.gymName || "(미입력)";
    gymCounts[gym] = (gymCounts[gym] ?? 0) + 1;
  }

  return {
    fileName: input.fileName,
    headerRow: input.headerRow,
    totalRows: rows.length,
    counts: {
      create: rows.filter((r) => r.decision === "create").length,
      skipExisting: rows.filter((r) => r.decision === "skip_existing").length,
      error: rows.filter((r) => r.decision === "error").length,
    },
    gymCounts,
    rows,
  };
}

export function sanitizeApplicantExcelPreviewForClient(
  preview: ApplicantExcelPreview,
): ApplicantExcelPreview {
  return {
    ...preview,
    rows: preview.rows.map((row) => {
      const { insuranceRrnDigits: _digits, insuranceConsentAgreed: _consent, ...safe } = row;
      return safe;
    }),
  };
}

export function assertPreviewReadyToCommit(preview: ApplicantExcelPreview): void {
  if (preview.counts.create === 0 && preview.counts.skipExisting === 0) {
    throw new Error(
      preview.counts.error > 0
        ? "등록 가능한 행이 없습니다. Excel을 수정한 뒤 다시 올려 주세요."
        : "새로 등록할 선수가 없습니다.",
    );
  }
}

export { birthDateToUtc };

// ────────────────────────────────────────────────────
// 구조화 전적 해석 헬퍼
// ────────────────────────────────────────────────────

type ResolvedRecord = {
  record: StructuredRecord | null;
  recordText: string;
  warning: string | null;
};

function parseOptionalInt(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * 총전/승/무/패 컬럼이 있으면 SSOT로 사용.
 * 없으면 전적 자유문장 파싱 시도.
 * 파싱 불확실하면 warning 반환.
 */
function resolveStructuredRecord(
  v: Record<string, unknown>,
  recordTextRaw: string,
): ResolvedRecord {
  const total = parseOptionalInt(v["총전"]);
  const wins = parseOptionalInt(v["승"]);
  const draws = parseOptionalInt(v["무"]);
  const losses = parseOptionalInt(v["패"]);

  // 신규 구조화 컬럼이 하나라도 있으면 SSOT
  if (total != null || wins != null || draws != null || losses != null) {
    const record: StructuredRecord = {
      totalBouts: total ?? 0,
      wins: wins ?? 0,
      draws: draws ?? 0,
      losses: losses ?? 0,
    };
    const validation = validateRecord(record);
    if (!validation.ok) {
      return {
        record: null,
        recordText: recordTextRaw,
        warning: validation.error,
      };
    }
    return {
      record,
      recordText: buildRecordText(record),
      warning: null,
    };
  }

  // 레거시: 자유문장 파싱
  if (!recordTextRaw) {
    return {
      record: { totalBouts: 0, wins: 0, draws: 0, losses: 0 },
      recordText: "무전",
      warning: null,
    };
  }

  const parsed = parseRecordText(recordTextRaw);
  if (parsed.ok) {
    return { record: parsed.record, recordText: parsed.recordText, warning: null };
  }
  return {
    record: null,
    recordText: recordTextRaw,
    warning: parsed.error,
  };
}
