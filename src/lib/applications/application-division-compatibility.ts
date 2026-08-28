/**
 * EventApplication manual division compatibility SSOT.
 * UI filter와 server validation이 동일한 규칙을 사용한다.
 */

import { parseApplicantGender } from "@/lib/applicant-excel/normalize";
import {
  eventAgeGroupMatchesInput,
  normalizeCompetitionCategory,
} from "@/lib/applications/competition-category";
import {
  genderMatches,
  sportMatches,
  type DivisionResolverCandidate,
} from "@/lib/applications/resolve-event-division";
import { AppError } from "@/lib/errors/app-error";

export type ApplicationDivisionCompatibilityInput = {
  fighterGender: string;
  competitionCategory: string;
  discipline?: string | null;
  division: DivisionResolverCandidate;
};

export function parseFighterGenderEnum(
  fighterGender: string,
): "male" | "female" | null {
  const parsed = parseApplicantGender(fighterGender);
  return parsed.ok ? parsed.gender : null;
}

export function isDivisionCompetitionCategoryCompatible(
  division: DivisionResolverCandidate,
  competitionCategory: string,
): boolean {
  if (!competitionCategory.trim()) return false;
  const category = normalizeCompetitionCategory(competitionCategory);
  return eventAgeGroupMatchesInput(division.ageGroup, category);
}

export function isApplicationDivisionCompatible(
  input: ApplicationDivisionCompatibilityInput,
): boolean {
  const gender = parseFighterGenderEnum(input.fighterGender);
  if (!gender) return false;
  if (!genderMatches(input.division.gender, gender)) return false;
  if (
    !isDivisionCompetitionCategoryCompatible(
      input.division,
      input.competitionCategory,
    )
  ) {
    return false;
  }
  if (!sportMatches(input.division, input.discipline)) return false;
  return true;
}

export function assertApplicationDivisionCompatible(
  input: ApplicationDivisionCompatibilityInput,
): void {
  const gender = parseFighterGenderEnum(input.fighterGender);
  if (!gender) {
    throw new AppError("VALIDATION_ERROR", "성별을 남/여로 입력해 주세요.");
  }
  if (!genderMatches(input.division.gender, gender)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "선수 성별과 일치하지 않는 경기구분입니다.",
    );
  }
  if (
    !isDivisionCompetitionCategoryCompatible(
      input.division,
      input.competitionCategory,
    )
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "신청 경기구분과 일치하지 않는 체급입니다.",
    );
  }
  if (!sportMatches(input.division, input.discipline)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "신청 종목과 일치하지 않는 경기구분입니다.",
    );
  }
}

export function filterCompatibleManualDivisions(input: {
  divisions: DivisionResolverCandidate[];
  fighterGender: string;
  competitionCategory: string;
  discipline?: string | null;
}): DivisionResolverCandidate[] {
  return input.divisions.filter((division) =>
    isApplicationDivisionCompatible({
      fighterGender: input.fighterGender,
      competitionCategory: input.competitionCategory,
      discipline: input.discipline,
      division,
    }),
  );
}

export function deriveManualDivisionOverrideState(input: {
  storedDivisionId: string | null | undefined;
  autoSuggestedDivisionId: string | null | undefined;
}): boolean {
  const stored = input.storedDivisionId?.trim();
  if (!stored) return false;
  const auto = input.autoSuggestedDivisionId?.trim();
  if (!auto) return false;
  return stored !== auto;
}
