import { formatUtcDateOnly } from "@/lib/date-only";
import { parseOptionalApplicationWeightKg } from "@/lib/applications/application-weight";
import { normalizeCompetitionCategory } from "@/lib/applications/competition-category";
import { validateFirstStageApplication } from "@/lib/applications/first-stage-application";
import {
  formatDivisionSearchLabel,
  resolveEventDivisionWeightFields,
} from "@/lib/event-division-fields";
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
import { resolveExcelSchoolGradeFields } from "@/lib/fighter/school-grade-input";
import type { ApplicantExcelHeader } from "@/lib/applicant-excel/columns";

export function applicantIdentityKey(input: {
  fighterName: string;
  birthDateIso: string;
  gender: string;
  gymName: string;
  divisionId: string | null;
  divisionSelectionType?: "REGISTERED" | "OTHER" | null;
  requestedDivisionText?: string | null;
}): string {
  const divisionPart =
    input.divisionSelectionType === "OTHER"
      ? `OTHER:${foldKey(input.requestedDivisionText ?? "")}`
      : (input.divisionId ?? "");
  return [
    foldKey(input.fighterName),
    input.birthDateIso,
    foldKey(input.gender),
    foldKey(input.gymName),
    divisionPart,
  ].join("|");
}

function existingKey(row: ApplicantExcelExistingIdentity): string {
  return applicantIdentityKey({
    fighterName: row.fighterName,
    birthDateIso: row.birthDateIso,
    gender: row.gender,
    gymName: row.gymName,
    divisionId: row.divisionId,
    divisionSelectionType: "REGISTERED",
  });
}

function gymNameFromSnapshot(snapshot: unknown): string {
  if (!snapshot || typeof snapshot !== "object") return "";
  const name = (snapshot as { name?: unknown }).name;
  return typeof name === "string" ? name : "";
}

export function identityFromExistingApplication(row: {
  id: string;
  divisionId: string | null;
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
  presentHeaders: readonly ApplicantExcelHeader[],
): ApplicantExcelPreviewRow {
  const v = parsed.values;
  const errors: string[] = [];
  const warnings: string[] = [];
  const fighterName = compactText(v.선수명);
  const gymName = compactText(v.체육관명);
  const ageGroup = compactText(v.경기구분);
  const weightClassLabel = compactText(v.체급);
  const legacyWeightLimit = compactText(v.체중기준);
  const sport = compactText(v.종목);
  const phone = compactText(v.연락처);
  const guardianName = compactText(v.보호자이름);
  const guardianPhone = compactText(v.보호자연락처);
  const otherDetailText = compactText(v.기타내용);
  const memo = compactText(v.메모);
  const rowNumber = compactText(v.번호);
  const ageNote = compactText(v.나이);
  const recordTextRaw = compactText(v.전적);
  const careerText = compactText(v.운동경력);

  const structuredRecord = resolveStructuredRecord(v, recordTextRaw);
  const recordText = structuredRecord.recordText;
  if (structuredRecord.warning) {
    errors.push(structuredRecord.warning);
  }

  // 레거시 파일: 형식만 검증. Excel만으로 추가정보 COMPLETED 승격 금지.
  const rrnParsed = parseOptionalResidentRegistrationNumber(v.주민등록번호);
  const consentParsed = parseOptionalExcelInsuranceConsent(
    v["보험가입 개인정보동의"],
  );
  if (!rrnParsed.ok) errors.push(rrnParsed.error);
  if (!consentParsed.ok) errors.push(consentParsed.error);
  if (
    (rrnParsed.ok && rrnParsed.digits) ||
    (consentParsed.ok && consentParsed.agreed)
  ) {
    warnings.push(
      "주민등록번호·보험동의는 1차 Excel에서 저장·완료 처리되지 않습니다. 추가정보 요청 단계에서 입력하세요.",
    );
  }

  const genderParsed = parseApplicantGender(v.성별);
  const birthDateRaw = compactText(v.생년월일);
  const birthDate = parseApplicantBirthDate(v.생년월일);
  if (birthDateRaw && !birthDate) {
    errors.push("생년월일 형식이 올바르지 않습니다.");
  }
  const weight = parseOptionalApplicationWeightKg(v.신청체중);
  const height = parseOptionalHeightCm(v.키);
  if (!height.ok) errors.push(height.error ?? "키가 올바르지 않습니다.");

  const category = normalizeCompetitionCategory(ageGroup);
  let divisionId: string | null = null;
  let divisionLabel = "";
  let resolvedWeightClassName = "";
  let resolvedWeightLimit = "";
  let divisionSelectionType: "REGISTERED" | "OTHER" | null = null;
  let requestedDivisionText: string | null = null;
  let reviewRequired = false;

  const firstStage = validateFirstStageApplication({
    gymName,
    fighterName,
    gender: genderParsed.ok ? genderParsed.gender : null,
    birthDate,
    phone,
    guardianPhone,
    guardianName,
    competitionCategory: ageGroup,
    divisionSelection: {
      weightClassLabel,
      otherDetailText,
    },
    record: structuredRecord.record,
    applicationWeightKg: v.신청체중,
    careerText,
    memo,
    sport,
    divisions,
  });

  if (!firstStage.ok) {
    for (const err of firstStage.errors) {
      if (
        err === "생년월일을 입력해 주세요." &&
        birthDateRaw &&
        !birthDate
      ) {
        continue;
      }
      if (!errors.includes(err)) errors.push(err);
    }
  } else {
    const sel = firstStage.value.selection;
    divisionSelectionType = sel.selectionType;
    reviewRequired = sel.reviewRequired;
    if (sel.selectionType === "REGISTERED") {
      divisionId = sel.divisionId;
      divisionLabel = formatDivisionSearchLabel(sel.division);
      const fields = resolveEventDivisionWeightFields(sel.division);
      resolvedWeightClassName = fields.weightClassName ?? "";
      resolvedWeightLimit = fields.weightLimitText ?? "";
      requestedDivisionText = null;
    } else {
      divisionId = null;
      divisionLabel = "기타";
      resolvedWeightClassName = "기타";
      resolvedWeightLimit = "";
      requestedDivisionText = sel.requestedDivisionText;
    }
  }

  const identityKey =
    fighterName &&
    birthDate &&
    genderParsed.ok &&
    gymName &&
    (divisionId || divisionSelectionType === "OTHER")
      ? applicantIdentityKey({
          fighterName,
          birthDateIso: birthDate,
          gender: genderParsed.gender,
          gymName,
          divisionId,
          divisionSelectionType,
          requestedDivisionText,
        })
      : `row:${parsed.excelRow}`;

  const hasError = errors.length > 0;
  const schoolResolved = resolveExcelSchoolGradeFields({
    hasGradeColumn: presentHeaders.includes("학년"),
    gradeCell: v.학년,
    categorySchoolLevel: category.schoolLevel,
    categorySchoolGrade: category.schoolGrade,
  });
  if (!schoolResolved.ok) {
    errors.push(schoolResolved.error);
  }

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
    normalizedAgeGroup: category.displayLabel || ageGroup,
    weightClass: resolvedWeightClassName || weightClassLabel,
    weightLimit: resolvedWeightLimit || legacyWeightLimit,
    sport,
    weightKg: weight.ok ? weight.kg : null,
    applicationWeightKg: weight.ok ? weight.kg : null,
    resolvedWeightClassName,
    resolvedWeightLimit,
    legacyWeightClass: weightClassLabel,
    categoryStatus: category.status,
    heightCm: height.cm,
    rowNumber,
    ageNote,
    recordText,
    careerText,
    insuranceRrnMasked: "",
    insuranceConsentLabel: "미입력",
    // Excel 경로: 추가정보 COMPLETED 승격 금지 — digits/agreed 미설정
    phone: firstStage.ok ? firstStage.value.phone : phone,
    guardianName,
    guardianPhone: firstStage.ok
      ? (firstStage.value.guardianPhone ?? "")
      : guardianPhone,
    memo,
    divisionId,
    divisionLabel,
    divisionSelectionType,
    requestedDivisionText,
    reviewRequired,
    otherDetailText,
    identityKey,
    decision: errors.length > 0 ? "error" : "create",
    decisionLabel:
      errors.length > 0
        ? "오류"
        : reviewRequired
          ? "체급 확인 필요"
          : "등록 가능",
    errors,
    warnings,
    totalBoutsSnapshot: structuredRecord.record?.totalBouts ?? null,
    winsSnapshot: structuredRecord.record?.wins ?? null,
    drawsSnapshot: structuredRecord.record?.draws ?? null,
    lossesSnapshot: structuredRecord.record?.losses ?? null,
    schoolLevelSnapshot: schoolResolved.ok
      ? schoolResolved.fields.schoolLevel
      : null,
    schoolGradeSnapshot: schoolResolved.ok
      ? schoolResolved.fields.schoolGrade
      : null,
    recordParseWarning: structuredRecord.warning ?? null,
  };
}

export function analyzeApplicantExcelRows(input: {
  fileName: string;
  headerRow: number;
  rows: ParsedApplicantExcelRow[];
  presentHeaders?: readonly ApplicantExcelHeader[];
  divisions: ApplicantDivisionCandidate[];
  existing: ApplicantExcelExistingIdentity[];
}): ApplicantExcelPreview {
  const existingSet = new Set(input.existing.map(existingKey));
  const seen = new Map<string, number>();
  const presentHeaders = input.presentHeaders ?? [];
  const rows = input.rows.map((row) =>
    analyzeOneRow(row, input.divisions, presentHeaders),
  );

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
      const {
        insuranceRrnDigits: _digits,
        insuranceConsentAgreed: _consent,
        ...safe
      } = row;
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
  const n =
    typeof raw === "number"
      ? raw
      : Number.parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * 총전/승/무/패 컬럼이 있으면 SSOT로 사용 (0/0/0/0 허용).
 * 구조화 컬럼이 모두 비어 있으면 레거시 전적 문자열만 파싱.
 * 둘 다 없으면 오류.
 */
function resolveStructuredRecord(
  v: Record<string, unknown>,
  recordTextRaw: string,
): ResolvedRecord {
  const total = parseOptionalInt(v["총전"]);
  const wins = parseOptionalInt(v["승"]);
  const draws = parseOptionalInt(v["무"]);
  const losses = parseOptionalInt(v["패"]);

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
      // Excel「전적」원문이 있으면 보존. 없으면 구조화 값으로 생성.
      recordText: recordTextRaw || buildRecordText(record),
      warning: null,
    };
  }

  // 레거시: 총전/승/무/패 컬럼 없을 때만 free-text 파싱
  if (recordTextRaw) {
    const parsed = parseRecordText(recordTextRaw);
    if (parsed.ok) {
      return {
        record: parsed.record,
        recordText: recordTextRaw || parsed.recordText,
        warning: null,
      };
    }
    return {
      record: null,
      recordText: recordTextRaw,
      warning: parsed.error,
    };
  }

  return {
    record: null,
    recordText: "",
    warning: "전적(총전/승/무/패)을 입력해 주세요.",
  };
}
