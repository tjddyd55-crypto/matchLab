import { formatSchoolGradeCompactLabel } from "@/lib/fighter/record";
import { formatBracketCandidateRecordLabel } from "@/lib/bracket-fighter-assignment";

export type BracketFighterMetaLineInput = {
  /**
   * 현재 Match/Bracket division 연령부 (EventDivision.ageGroup).
   * 신청 division·birthDate로 재계산하지 않는다.
   */
  matchDivisionAgeGroup?: string | null;
  fighterGender?: string | null;
  divisionGender?: string | null;
  applicationWeightKg?: number | null;
  recordSummary?: string | null;
  schoolLevel?: string | null;
  schoolGrade?: number | null;
  /** 안정적 age SSOT가 있을 때만 전달. 임의 birthDate 계산 금지. */
  ageLabel?: string | null;
};

function resolveGenderLabel(
  fighterGender: string | null | undefined,
  divisionGender: string | null | undefined,
): string | null {
  const fg = (fighterGender ?? "").trim().toLowerCase();
  if (fg === "male") return "남성";
  if (fg === "female") return "여성";
  const dg = (divisionGender ?? "").trim().toLowerCase();
  if (dg === "male") return "남성";
  if (dg === "female") return "여성";
  return null;
}

/**
 * 잡힌 경기 카드 2줄 메타.
 * 권장 순서: [연령부] · [성별] · [신청체중] · [학년] · [전적]
 * 존재하는 값만 ` · ` 로 join.
 */
export function buildBracketFighterMetaLine(
  input: BracketFighterMetaLineInput,
): string | undefined {
  const ageGroup = input.matchDivisionAgeGroup?.trim() || null;
  const gender = resolveGenderLabel(input.fighterGender, input.divisionGender);
  const weight =
    input.applicationWeightKg != null
      ? `${input.applicationWeightKg}kg`
      : null;
  const grade = formatSchoolGradeCompactLabel({
    schoolLevel: input.schoolLevel,
    schoolGrade: input.schoolGrade,
  });
  const age = input.ageLabel?.trim() || null;
  const record = input.recordSummary
    ? formatBracketCandidateRecordLabel(input.recordSummary)
    : null;

  const parts = [ageGroup, gender, weight, grade, age, record].filter(
    (part): part is string => Boolean(part && part.trim()),
  );

  if (parts.length === 0) return undefined;
  return parts.join(" · ");
}

export function buildBracketFighterMetaLineFromOption(
  option: {
    fighterGender: string | null;
    applicationWeightKg: number | null;
    recordSummary: string;
    schoolLevel?: string | null;
    schoolGrade?: number | null;
    division: { gender: string | null };
  },
  matchDivisionAgeGroup?: string | null,
): string | undefined {
  return buildBracketFighterMetaLine({
    matchDivisionAgeGroup,
    fighterGender: option.fighterGender,
    divisionGender: option.division.gender,
    applicationWeightKg: option.applicationWeightKg,
    recordSummary: option.recordSummary,
    schoolLevel: option.schoolLevel,
    schoolGrade: option.schoolGrade,
  });
}
