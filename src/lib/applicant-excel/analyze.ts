import {
  formatUtcDateOnly,
} from "@/lib/date-only";
import { formatDivisionSearchLabel } from "@/lib/event-division-fields";
import { matchEventDivision } from "@/lib/applicant-excel/match-division";
import {
  birthDateToUtc,
  compactText,
  foldKey,
  genderLabel,
  parseApplicantBirthDate,
  parseApplicantGender,
  parseOptionalHeightCm,
  parseOptionalWeightKg,
} from "@/lib/applicant-excel/normalize";
import type { ApplicantDivisionCandidate } from "@/lib/applicant-excel/match-division";
import type { ParsedApplicantExcelRow } from "@/lib/applicant-excel/parse";
import { parseExcelInsuranceConsent } from "@/lib/athlete-application/insurance-consent";
import { parseResidentRegistrationNumber } from "@/lib/athlete-application/resident-registration-number";
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
  fighter: { name: string; birthDate: Date; gender: string };
}): ApplicantExcelExistingIdentity {
  return {
    applicationId: row.id,
    divisionId: row.divisionId,
    fighterName: row.fighter.name,
    birthDateIso: formatUtcDateOnly(row.fighter.birthDate, "-"),
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
  const fighterName = compactText(v.선수명);
  const gymName = compactText(v.체육관명);
  const ageGroup = compactText(v.경기구분);
  const weightClass = compactText(v.체급);
  const weightLimit = compactText(v.체중기준);
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
  const rrnParsed = parseResidentRegistrationNumber(v.주민등록번호);
  const consentParsed = parseExcelInsuranceConsent(v["보험가입 개인정보동의"]);
  if (!rrnParsed.ok) errors.push(rrnParsed.error);
  if (!consentParsed.ok) errors.push(consentParsed.error);

  if (!fighterName) errors.push("선수명이 없습니다.");
  if (!gymName) errors.push("체육관명이 없습니다.");
  if (!ageGroup) errors.push("경기구분이 없습니다.");
  if (!weightClass) errors.push("체급이 없습니다.");

  const genderParsed = parseApplicantGender(v.성별);
  if (!genderParsed.ok) errors.push("성별을 남/여로 입력해 주세요.");
  const birthDate = parseApplicantBirthDate(v.생년월일);
  if (!birthDate) errors.push("생년월일이 올바르지 않습니다.");
  const weight = parseOptionalWeightKg(v.체중);
  if (!weight.ok) errors.push(weight.error ?? "체중이 올바르지 않습니다.");
  const height = parseOptionalHeightCm(v.키);
  if (!height.ok) errors.push(height.error ?? "키가 올바르지 않습니다.");

  let divisionId: string | null = null;
  let divisionLabel = "";
  if (genderParsed.ok && ageGroup && weightClass) {
    const matched = matchEventDivision({
      gender: genderParsed.gender,
      row: {
        gender: v.성별,
        ageGroup,
        weightClass,
        weightLimit,
        sport,
      },
      divisions,
    });
    if (matched.ok) {
      divisionId = matched.division.id;
      divisionLabel = formatDivisionSearchLabel(matched.division);
    } else {
      errors.push(matched.reason);
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
    weightClass,
    weightLimit,
    sport,
    weightKg: weight.kg,
    heightCm: height.cm,
    rowNumber,
    ageNote,
    recordText,
    careerText,
    insuranceRrnMasked: rrnParsed.ok ? rrnParsed.masked : "",
    insuranceConsentLabel: consentParsed.ok ? "동의" : compactText(v["보험가입 개인정보동의"]),
    insuranceRrnDigits: rrnParsed.ok ? rrnParsed.digits : undefined,
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
    totalBoutsSnapshot: structuredRecord.record?.totalBouts ?? null,
    winsSnapshot: structuredRecord.record?.wins ?? null,
    drawsSnapshot: structuredRecord.record?.draws ?? null,
    lossesSnapshot: structuredRecord.record?.losses ?? null,
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
      const { insuranceRrnDigits: _digits, ...safe } = row;
      return safe;
    }),
  };
}

export function assertPreviewReadyToCommit(preview: ApplicantExcelPreview): void {
  if (preview.counts.error > 0) {
    throw new Error(
      "오류 행이 있어 등록할 수 없습니다. Excel을 수정한 뒤 다시 올려 주세요.",
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
