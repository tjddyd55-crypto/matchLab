import { publicAgeGroupFromBirthDate } from "@/lib/public-fighter/age-group";

export type DivisionMatchFields = {
  gender: string | null;
  ageGroup: string | null;
};

export type FighterMatchFields = {
  gender: string;
  birthDate?: Date | string;
  ageGroup?: string;
};

const GENDER_ALIASES: Record<string, "male" | "female"> = {
  male: "male",
  female: "female",
  m: "male",
  f: "female",
  남: "male",
  남성: "male",
  남자: "male",
  여: "female",
  여성: "female",
  여자: "female",
};

const AGE_GROUP_ALIASES: Record<string, string> = {
  u12: "초등부",
  u14: "중등부",
  u16: "고등부",
  open: "일반부",
  초등: "초등부",
  중등: "중등부",
  고등: "고등부",
  일반: "일반부",
  "대학·일반부": "일반부",
  "대학/일반부": "일반부",
};

function normalizeGender(value: string | null | undefined): "male" | "female" | null {
  if (!value?.trim()) return null;
  return GENDER_ALIASES[value.trim().toLowerCase()] ?? null;
}

function normalizeAgeGroup(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  const alias = AGE_GROUP_ALIASES[trimmed.toLowerCase()];
  return alias ?? trimmed;
}

export function formatFighterGenderLabel(gender: string): string {
  const normalized = normalizeGender(gender);
  if (normalized === "male") return "남";
  if (normalized === "female") return "여";
  return gender;
}

export function isDivisionRecommendedForFighter(
  fighter: FighterMatchFields,
  division: DivisionMatchFields,
): boolean {
  const fighterGender = normalizeGender(fighter.gender);
  const divisionGender = normalizeGender(division.gender);
  if (fighterGender && divisionGender && fighterGender !== divisionGender) {
    return false;
  }

  const fighterAgeGroup = normalizeAgeGroup(
    fighter.ageGroup ??
      (fighter.birthDate
        ? publicAgeGroupFromBirthDate(
            typeof fighter.birthDate === "string"
              ? new Date(fighter.birthDate)
              : fighter.birthDate,
          )
        : null),
  );
  const divisionAgeGroup = normalizeAgeGroup(division.ageGroup);
  if (fighterAgeGroup && divisionAgeGroup && fighterAgeGroup !== divisionAgeGroup) {
    return false;
  }

  return true;
}

export function divisionMismatchWarnings(
  fighter: FighterMatchFields,
  division: DivisionMatchFields,
): string[] {
  const warnings: string[] = [];
  const fighterGender = normalizeGender(fighter.gender);
  const divisionGender = normalizeGender(division.gender);
  if (fighterGender && divisionGender && fighterGender !== divisionGender) {
    warnings.push("선수 성별과 부문 성별이 다릅니다.");
  }

  const fighterAgeGroup = normalizeAgeGroup(
    fighter.ageGroup ??
      (fighter.birthDate
        ? publicAgeGroupFromBirthDate(
            typeof fighter.birthDate === "string"
              ? new Date(fighter.birthDate)
              : fighter.birthDate,
          )
        : null),
  );
  const divisionAgeGroup = normalizeAgeGroup(division.ageGroup);
  if (fighterAgeGroup && divisionAgeGroup && fighterAgeGroup !== divisionAgeGroup) {
    warnings.push("선수 연령부와 부문 연령부가 다릅니다.");
  }

  return warnings;
}
