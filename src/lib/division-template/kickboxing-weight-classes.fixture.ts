/**
 * 킥복싱 체급표 원본(이미지) 66행 fixture.
 * 일반적인 규정으로 임의 추가/수정하지 않는다.
 */
import type { DivisionTemplateItemInput } from "@/lib/validators/division-template.validator";
import {
  formatWeightLimitText,
  type WeightLimitOperator,
} from "@/lib/division-template/division-template-parse";

type FixtureSeed = {
  ageGroup: string;
  gender: "male" | "female";
  weightClassName: string;
  kg: number;
  operator: WeightLimitOperator;
  sortOrder: number;
};

const SEEDS: FixtureSeed[] = [
  // 초등부 남성 7
  { ageGroup: "초등부", gender: "male", weightClassName: "핀급", kg: 30, operator: "under", sortOrder: 1 },
  { ageGroup: "초등부", gender: "male", weightClassName: "라이트플라이급", kg: 35, operator: "under", sortOrder: 2 },
  { ageGroup: "초등부", gender: "male", weightClassName: "플라이급", kg: 40, operator: "under", sortOrder: 3 },
  { ageGroup: "초등부", gender: "male", weightClassName: "밴텀급", kg: 45, operator: "under", sortOrder: 4 },
  { ageGroup: "초등부", gender: "male", weightClassName: "페더급", kg: 50, operator: "under", sortOrder: 5 },
  { ageGroup: "초등부", gender: "male", weightClassName: "라이트급", kg: 55, operator: "under", sortOrder: 6 },
  { ageGroup: "초등부", gender: "male", weightClassName: "헤비급", kg: 55, operator: "over", sortOrder: 7 },
  // 초등부 여성 6
  { ageGroup: "초등부", gender: "female", weightClassName: "핀급", kg: 30, operator: "under", sortOrder: 1 },
  { ageGroup: "초등부", gender: "female", weightClassName: "라이트플라이급", kg: 35, operator: "under", sortOrder: 2 },
  { ageGroup: "초등부", gender: "female", weightClassName: "플라이급", kg: 40, operator: "under", sortOrder: 3 },
  { ageGroup: "초등부", gender: "female", weightClassName: "밴텀급", kg: 45, operator: "under", sortOrder: 4 },
  { ageGroup: "초등부", gender: "female", weightClassName: "페더급", kg: 50, operator: "under", sortOrder: 5 },
  { ageGroup: "초등부", gender: "female", weightClassName: "헤비급", kg: 50, operator: "over", sortOrder: 6 },
  // 중등부 남성 8
  { ageGroup: "중등부", gender: "male", weightClassName: "라이트플라이급", kg: 40, operator: "under", sortOrder: 1 },
  { ageGroup: "중등부", gender: "male", weightClassName: "플라이급", kg: 45, operator: "under", sortOrder: 2 },
  { ageGroup: "중등부", gender: "male", weightClassName: "밴텀급", kg: 50, operator: "under", sortOrder: 3 },
  { ageGroup: "중등부", gender: "male", weightClassName: "페더급", kg: 55, operator: "under", sortOrder: 4 },
  { ageGroup: "중등부", gender: "male", weightClassName: "라이트급", kg: 60, operator: "under", sortOrder: 5 },
  { ageGroup: "중등부", gender: "male", weightClassName: "라이트웰터급", kg: 65, operator: "under", sortOrder: 6 },
  { ageGroup: "중등부", gender: "male", weightClassName: "웰터급", kg: 70, operator: "under", sortOrder: 7 },
  { ageGroup: "중등부", gender: "male", weightClassName: "헤비급", kg: 70, operator: "over", sortOrder: 8 },
  // 중등부 여성 7
  { ageGroup: "중등부", gender: "female", weightClassName: "핀급", kg: 35, operator: "under", sortOrder: 1 },
  { ageGroup: "중등부", gender: "female", weightClassName: "라이트플라이급", kg: 40, operator: "under", sortOrder: 2 },
  { ageGroup: "중등부", gender: "female", weightClassName: "플라이급", kg: 45, operator: "under", sortOrder: 3 },
  { ageGroup: "중등부", gender: "female", weightClassName: "밴텀급", kg: 50, operator: "under", sortOrder: 4 },
  { ageGroup: "중등부", gender: "female", weightClassName: "페더급", kg: 55, operator: "under", sortOrder: 5 },
  { ageGroup: "중등부", gender: "female", weightClassName: "라이트급", kg: 60, operator: "under", sortOrder: 6 },
  { ageGroup: "중등부", gender: "female", weightClassName: "헤비급", kg: 60, operator: "over", sortOrder: 7 },
  // 고등부 남성 9 (이미지 표기 그대로 — 임의 추가 금지)
  { ageGroup: "고등부", gender: "male", weightClassName: "핀급", kg: 50, operator: "under", sortOrder: 1 },
  { ageGroup: "고등부", gender: "male", weightClassName: "라이트플라이급", kg: 55, operator: "under", sortOrder: 2 },
  { ageGroup: "고등부", gender: "male", weightClassName: "라이트급", kg: 60, operator: "under", sortOrder: 3 },
  { ageGroup: "고등부", gender: "male", weightClassName: "라이트웰터급", kg: 63.5, operator: "under", sortOrder: 4 },
  { ageGroup: "고등부", gender: "male", weightClassName: "웰터급", kg: 67, operator: "under", sortOrder: 5 },
  { ageGroup: "고등부", gender: "male", weightClassName: "라이트미들급", kg: 71, operator: "under", sortOrder: 6 },
  { ageGroup: "고등부", gender: "male", weightClassName: "미들급", kg: 75, operator: "under", sortOrder: 7 },
  { ageGroup: "고등부", gender: "male", weightClassName: "라이트헤비급", kg: 81, operator: "under", sortOrder: 8 },
  { ageGroup: "고등부", gender: "male", weightClassName: "헤비급", kg: 81, operator: "over", sortOrder: 9 },
  // 고등부 여성 7
  { ageGroup: "고등부", gender: "female", weightClassName: "핀급", kg: 40, operator: "under", sortOrder: 1 },
  { ageGroup: "고등부", gender: "female", weightClassName: "라이트플라이급", kg: 45, operator: "under", sortOrder: 2 },
  { ageGroup: "고등부", gender: "female", weightClassName: "플라이급", kg: 50, operator: "under", sortOrder: 3 },
  { ageGroup: "고등부", gender: "female", weightClassName: "밴텀급", kg: 55, operator: "under", sortOrder: 4 },
  { ageGroup: "고등부", gender: "female", weightClassName: "페더급", kg: 60, operator: "under", sortOrder: 5 },
  { ageGroup: "고등부", gender: "female", weightClassName: "라이트급", kg: 65, operator: "under", sortOrder: 6 },
  { ageGroup: "고등부", gender: "female", weightClassName: "헤비급", kg: 65, operator: "over", sortOrder: 7 },
  // 대학·일반부 남성 13
  { ageGroup: "대학·일반부", gender: "male", weightClassName: "핀급", kg: 45, operator: "under", sortOrder: 1 },
  { ageGroup: "대학·일반부", gender: "male", weightClassName: "라이트플라이급", kg: 48, operator: "under", sortOrder: 2 },
  { ageGroup: "대학·일반부", gender: "male", weightClassName: "밴텀급", kg: 54, operator: "under", sortOrder: 3 },
  { ageGroup: "대학·일반부", gender: "male", weightClassName: "페더급", kg: 57, operator: "under", sortOrder: 4 },
  { ageGroup: "대학·일반부", gender: "male", weightClassName: "라이트급", kg: 60, operator: "under", sortOrder: 5 },
  { ageGroup: "대학·일반부", gender: "male", weightClassName: "라이트웰터급", kg: 63.5, operator: "under", sortOrder: 6 },
  { ageGroup: "대학·일반부", gender: "male", weightClassName: "웰터급", kg: 67, operator: "under", sortOrder: 7 },
  { ageGroup: "대학·일반부", gender: "male", weightClassName: "라이트미들급", kg: 71, operator: "under", sortOrder: 8 },
  { ageGroup: "대학·일반부", gender: "male", weightClassName: "미들급", kg: 75, operator: "under", sortOrder: 9 },
  { ageGroup: "대학·일반부", gender: "male", weightClassName: "라이트헤비급", kg: 81, operator: "under", sortOrder: 10 },
  { ageGroup: "대학·일반부", gender: "male", weightClassName: "크루저급", kg: 86, operator: "under", sortOrder: 11 },
  { ageGroup: "대학·일반부", gender: "male", weightClassName: "헤비급", kg: 91, operator: "under", sortOrder: 12 },
  { ageGroup: "대학·일반부", gender: "male", weightClassName: "슈퍼헤비급", kg: 91, operator: "over", sortOrder: 13 },
  // 대학·일반부 여성 9
  { ageGroup: "대학·일반부", gender: "female", weightClassName: "핀급", kg: 45, operator: "under", sortOrder: 1 },
  { ageGroup: "대학·일반부", gender: "female", weightClassName: "라이트플라이급", kg: 48, operator: "under", sortOrder: 2 },
  { ageGroup: "대학·일반부", gender: "female", weightClassName: "플라이급", kg: 51, operator: "under", sortOrder: 3 },
  { ageGroup: "대학·일반부", gender: "female", weightClassName: "밴텀급", kg: 54, operator: "under", sortOrder: 4 },
  { ageGroup: "대학·일반부", gender: "female", weightClassName: "페더급", kg: 57, operator: "under", sortOrder: 5 },
  { ageGroup: "대학·일반부", gender: "female", weightClassName: "라이트급", kg: 60, operator: "under", sortOrder: 6 },
  { ageGroup: "대학·일반부", gender: "female", weightClassName: "미들급", kg: 65, operator: "under", sortOrder: 7 },
  { ageGroup: "대학·일반부", gender: "female", weightClassName: "라이트헤비급", kg: 70, operator: "under", sortOrder: 8 },
  { ageGroup: "대학·일반부", gender: "female", weightClassName: "헤비급", kg: 70, operator: "over", sortOrder: 9 },
];

export const KICKBOXING_WEIGHT_CLASS_FIXTURE_COUNT = 66;

export function getKickboxingWeightClassFixtureSeeds(): readonly FixtureSeed[] {
  return SEEDS;
}

export function buildKickboxingWeightClassFixtureItems(
  sportType = "kickboxing",
): DivisionTemplateItemInput[] {
  return SEEDS.map((s) => {
    const weightLimitText = formatWeightLimitText(s.kg, s.operator);
    const weightClass = `${s.weightClassName} ${weightLimitText}`.trim();
    return {
      sportType,
      ruleType: null,
      gender: s.gender,
      ageGroup: s.ageGroup,
      weightClassName: s.weightClassName,
      weightLimitText,
      weightLimitKg: s.kg,
      limitType: s.operator === "over" ? "over" : "under",
      weightClass,
      skillLevel: null,
      displayOrder: s.sortOrder,
      isActive: true,
    };
  });
}

export function countKickboxingFixtureBySection(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of SEEDS) {
    const key = `${s.ageGroup}|${s.gender}`;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}
