import { parseSingleWeightEntry } from "@/lib/division-template/division-template-parse";

/** 경기구분 목록 그룹화·정렬용 최소 필드 */
export type EventDivisionGroupItem = {
  id: string;
  sportType: string;
  ruleType: string | null;
  gender: string | null;
  ageGroup: string | null;
  weightClassName: string | null;
  weightLimitText: string | null;
  weightClass: string | null;
  skillLevel: string | null;
};

export const EVENT_DIVISION_AGE_GROUP_ORDER = [
  "유치부",
  "초등부",
  "중등부",
  "고등부",
  "대학부",
  "일반부",
  "대학·일반부",
  "기타",
] as const;

export type GenderBucket = "male" | "female" | "unknown";

export type AgeGroupDivisionGroup = {
  ageGroup: string;
  male: EventDivisionGroupItem[];
  female: EventDivisionGroupItem[];
  unknown: EventDivisionGroupItem[];
};

const AGE_GROUP_RANK = new Map<string, number>(
  EVENT_DIVISION_AGE_GROUP_ORDER.map((label, index) => [label, index]),
);

const UNASSIGNED_AGE_GROUP = "(연령부 미지정)";

export function normalizeGenderBucket(
  gender: string | null | undefined,
): GenderBucket {
  const value = gender?.trim().toLowerCase() ?? "";
  if (value === "male" || value === "m" || value === "남" || value === "남성") {
    return "male";
  }
  if (value === "female" || value === "f" || value === "여" || value === "여성") {
    return "female";
  }
  return "unknown";
}

function extractWeightSortKey(division: EventDivisionGroupItem): number {
  const limit = division.weightLimitText?.trim();
  if (limit) {
    const parsed = parseSingleWeightEntry(
      /kg/i.test(limit) ? `x ${limit}` : limit,
    );
    if (parsed.weightLimitKg != null) return parsed.weightLimitKg;
  }

  const combined = division.weightClass?.trim();
  if (combined) {
    const parsed = parseSingleWeightEntry(combined);
    if (parsed.weightLimitKg != null) return parsed.weightLimitKg;
  }

  return Number.MAX_SAFE_INTEGER;
}

function sortDivisionsInGenderBucket(
  rows: EventDivisionGroupItem[],
): EventDivisionGroupItem[] {
  return [...rows].sort((a, b) => {
    const weightA = extractWeightSortKey(a);
    const weightB = extractWeightSortKey(b);
    if (weightA !== weightB) return weightA - weightB;

    const nameA = a.weightClassName?.trim() || a.weightClass?.trim() || "";
    const nameB = b.weightClassName?.trim() || b.weightClass?.trim() || "";
    return nameA.localeCompare(nameB, "ko");
  });
}

function compareAgeGroupLabels(a: string, b: string): number {
  const rankA = AGE_GROUP_RANK.get(a);
  const rankB = AGE_GROUP_RANK.get(b);
  const orderA =
    rankA !== undefined ? rankA : EVENT_DIVISION_AGE_GROUP_ORDER.length;
  const orderB =
    rankB !== undefined ? rankB : EVENT_DIVISION_AGE_GROUP_ORDER.length;
  if (orderA !== orderB) return orderA - orderB;

  if (a === UNASSIGNED_AGE_GROUP && b !== UNASSIGNED_AGE_GROUP) return 1;
  if (b === UNASSIGNED_AGE_GROUP && a !== UNASSIGNED_AGE_GROUP) return -1;
  return a.localeCompare(b, "ko");
}

/** 연령부 → 성별(male/female/unknown) 계층으로 경기구분을 묶는다. */
export function groupEventDivisions(
  divisions: EventDivisionGroupItem[],
): AgeGroupDivisionGroup[] {
  const map = new Map<string, AgeGroupDivisionGroup>();

  for (const division of divisions) {
    const ageGroup = division.ageGroup?.trim() || UNASSIGNED_AGE_GROUP;
    let group = map.get(ageGroup);
    if (!group) {
      group = { ageGroup, male: [], female: [], unknown: [] };
      map.set(ageGroup, group);
    }
    group[normalizeGenderBucket(division.gender)].push(division);
  }

  const groups = [...map.values()].map((group) => ({
    ...group,
    male: sortDivisionsInGenderBucket(group.male),
    female: sortDivisionsInGenderBucket(group.female),
    unknown: sortDivisionsInGenderBucket(group.unknown),
  }));

  groups.sort((a, b) => compareAgeGroupLabels(a.ageGroup, b.ageGroup));
  return groups;
}
