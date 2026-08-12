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
import type {
  ApplicantExcelExistingIdentity,
  ApplicantExcelPreview,
  ApplicantExcelPreviewRow,
} from "@/lib/applicant-excel/types";

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
  const recordText = compactText(v.전적);
  const careerText = compactText(v.운동경력);

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

export function assertPreviewReadyToCommit(preview: ApplicantExcelPreview): void {
  if (preview.counts.error > 0) {
    throw new Error(
      "오류 행이 있어 등록할 수 없습니다. Excel을 수정한 뒤 다시 올려 주세요.",
    );
  }
}

export { birthDateToUtc };
