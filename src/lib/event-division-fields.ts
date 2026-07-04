import { parseSingleWeightEntry, normalizeWeightLimitInput } from "@/lib/division-template/division-template-parse";
import { DIVISION_TEMPLATE_GENDER_LABELS } from "@/lib/division-template/division-template-constants";
import type { DivisionGenderTone } from "@/lib/ui/division-gender-ui";
import { resolveDivisionGenderTone } from "@/lib/ui/division-gender-ui";

export type EventDivisionWeightFields = {
  weightClassName: string | null;
  weightLimitText: string | null;
  weightClass: string | null;
};

export type EventDivisionWeightInput = {
  weightClass?: string | null;
  weightClassName?: string | null;
  weightLimitText?: string | null;
};

const INSIGNIFICANT_WEIGHT_CLASS_NAMES = new Set(["-", "–", "—", "−"]);

/** Prisma EventDivision select — 표시용 split weight 필드 포함 */
export const EVENT_DIVISION_DISPLAY_SELECT = {
  sportType: true,
  ruleType: true,
  gender: true,
  ageGroup: true,
  weightClass: true,
  weightClassName: true,
  weightLimitText: true,
  skillLevel: true,
} as const;

/** 체급명 placeholder(단독 `-` 등)는 표시·조합에서 제외한다. */
function isInsignificantWeightClassName(
  name: string | null | undefined,
): boolean {
  const trimmed = name?.trim();
  if (!trimmed) return true;
  return INSIGNIFICANT_WEIGHT_CLASS_NAMES.has(trimmed);
}

/**
 * 표시용 체중 기준 — 60 / 60kg / -60 / -60kg → -60kg, 중복 하이픈 제거.
 */
export function normalizeWeightLimitDisplayText(
  raw: string | null | undefined,
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  let normalized = normalizeWeightLimitInput(trimmed);
  if (!normalized) return null;

  // legacy/저장 오류: "- -60kg", "-  -60kg" → "-60kg"
  normalized = normalized.replace(/^-\s*-\s*/, "-");

  return normalized;
}

/** 체급명 + 체중 기준 표시 SSOT — chip/compact label의 체중 구간. */
export function resolveDivisionWeightLabel(
  division: EventDivisionWeightInput,
): string | null {
  const fields = resolveEventDivisionWeightFields(division);
  const limit = fields.weightLimitText;
  const name = isInsignificantWeightClassName(fields.weightClassName)
    ? null
    : fields.weightClassName;

  if (name && limit) {
    return `${name} · ${limit}`;
  }
  if (limit) return limit;
  if (name) return name;
  return fields.weightClass;
}

/** 체급명·체중 기준·표시용 weightClass를 일관되게 해석한다. */
export function resolveEventDivisionWeightFields(
  division: EventDivisionWeightInput,
): EventDivisionWeightFields {
  const rawName = division.weightClassName?.trim() || null;
  const name = isInsignificantWeightClassName(rawName) ? null : rawName;
  const limit = normalizeWeightLimitDisplayText(division.weightLimitText);

  if (name || limit) {
    const weightClass = [name, limit].filter(Boolean).join(" ").trim() || null;
    return { weightClassName: name, weightLimitText: limit, weightClass };
  }

  const legacy = division.weightClass?.trim() || null;
  if (!legacy) {
    return { weightClassName: null, weightLimitText: null, weightClass: null };
  }

  const parsed = parseSingleWeightEntry(legacy);
  const parsedName = isInsignificantWeightClassName(parsed.weightClassName)
    ? null
    : parsed.weightClassName?.trim() || null;
  const parsedLimit = normalizeWeightLimitDisplayText(parsed.weightLimitText);

  if (parsedLimit) {
    const weightClass =
      [parsedName, parsedLimit].filter(Boolean).join(" ").trim() || legacy;
    return {
      weightClassName: parsedName,
      weightLimitText: parsedLimit,
      weightClass,
    };
  }

  // legacy 전체가 "-60kg" 형태인 경우 parseSingleWeightEntry가 name="-"로 오인할 수 있음
  const legacyLimit = normalizeWeightLimitDisplayText(legacy);
  if (legacyLimit && /^-\d/.test(legacyLimit)) {
    return {
      weightClassName: null,
      weightLimitText: legacyLimit,
      weightClass: legacyLimit,
    };
  }

  return {
    weightClassName: parsedName || legacy,
    weightLimitText: null,
    weightClass: legacy,
  };
}

/** 폼·서비스 입력을 DB 저장용 필드로 정규화한다. */
export function normalizeEventDivisionWeightInput(
  input: EventDivisionWeightInput,
): EventDivisionWeightFields {
  return resolveEventDivisionWeightFields(input);
}

export function formatDivisionGenderLabel(
  gender: string | null | undefined,
): string | null {
  const value = gender?.trim();
  if (!value) return null;
  if (value in DIVISION_TEMPLATE_GENDER_LABELS) {
    return DIVISION_TEMPLATE_GENDER_LABELS[
      value as keyof typeof DIVISION_TEMPLATE_GENDER_LABELS
    ];
  }
  return value;
}

export function toEventDivisionDisplayInput(
  division:
    | (EventDivisionDisplayInput & {
        weightClassName?: string | null;
        weightLimitText?: string | null;
      })
    | null
    | undefined,
): EventDivisionDisplayInput | null {
  if (!division) return null;
  return {
    sportType: division.sportType,
    ruleType: division.ruleType,
    gender: division.gender,
    ageGroup: division.ageGroup,
    weightClass: division.weightClass,
    weightClassName: division.weightClassName ?? null,
    weightLimitText: division.weightLimitText ?? null,
    skillLevel: division.skillLevel,
  };
}

export type EventDivisionDisplayInput = {
  sportType: string | null;
  ruleType: string | null;
  gender: string | null;
  ageGroup: string | null;
  weightClass: string | null;
  weightClassName?: string | null;
  weightLimitText?: string | null;
  skillLevel: string | null;
};

export type DivisionDisplayParts = {
  ageGroup: string | null;
  genderLabel: string | null;
  genderTone: DivisionGenderTone;
  weightChipLabel: string | null;
  skillLevel: string | null;
  /** @deprecated use sportTitle — rule은 UI에 표시하지 않는다 */
  sportRuleLabel: string | null;
  sportTitle: string | null;
};

const AUTO_BRACKET_TITLE_PREFIX = "자동 생성 · ";

/** 체급 chip용 — weightClassName + weightLimitText, legacy weightClass fallback */
export function formatDivisionWeightChipLabel(
  division: EventDivisionWeightInput,
): string | null {
  return resolveDivisionWeightLabel(division);
}

/** 종목만 반환 — rule/skill은 UI에 표시하지 않는다. */
export function formatDivisionSportTitle(d: {
  sportType?: string | null;
}): string | null {
  const label = d.sportType?.trim();
  return label || null;
}

/**
 * @deprecated formatDivisionSportTitle 사용. ruleType은 UI에 포함하지 않는다.
 */
export function formatDivisionSportRuleLabel(d: {
  sportType?: string | null;
  ruleType?: string | null;
}): string | null {
  return formatDivisionSportTitle(d);
}

export function resolveDivisionDisplayParts(
  division: EventDivisionDisplayInput,
): DivisionDisplayParts {
  return {
    ageGroup: division.ageGroup?.trim() || null,
    genderLabel: formatDivisionGenderLabel(division.gender),
    genderTone: resolveDivisionGenderTone(
      division.gender as "male" | "female" | null | undefined,
    ),
    weightChipLabel: formatDivisionWeightChipLabel(division),
    skillLevel: division.skillLevel?.trim() || null,
    sportTitle: formatDivisionSportTitle(division),
    sportRuleLabel: formatDivisionSportTitle(division),
  };
}

/** 경기 카드 compact 한 줄 — U16 · 남성 · -60kg (룰/실력 제외) */
export function formatDivisionCompactLine(
  division: EventDivisionDisplayInput,
): string {
  return formatDivisionMainLabel(division);
}

/**
 * 사용자 노출 메인 라벨 — 연령부 · 성별 · 체급명/체중 기준.
 * 신청자 목록·현장계체·대진 후보 등 목록형 화면 공용.
 * sport/rule/skill은 row에 포함하지 않는다. 종목은 섹션 헤더(formatDivisionSportTitle) 전용.
 */
export function formatDivisionMainLabel(
  division: EventDivisionDisplayInput,
): string {
  const parts = resolveDivisionDisplayParts(division);
  return [parts.ageGroup, parts.genderLabel, parts.weightChipLabel]
    .filter((x): x is string => Boolean(x))
    .join(" · ");
}

/**
 * row 보조 라인용 — 기본 UI에서는 사용하지 않는다.
 * 종목은 formatDivisionSportTitle + 섹션 헤더로만 표시.
 */
export function formatDivisionSecondaryLabel(
  division: EventDivisionDisplayInput,
): string | null {
  return formatDivisionSportTitle(division);
}

/** formatDivisionMainLabel 별칭 — 묶음 · 성별 · 체급명 · 체중 기준 */
export function formatDivisionCompactLabel(
  division: EventDivisionDisplayInput,
): string {
  return formatDivisionMainLabel(division);
}

/** 검색·tooltip용 — 메인 + 종목 (rule/skill 제외) */
export function formatDivisionSearchLabel(
  division: EventDivisionDisplayInput,
): string {
  const main = formatDivisionMainLabel(division);
  const sport = formatDivisionSportTitle(division);
  return sport ? `${main} · ${sport}` : main;
}

export function isAutoGeneratedBracketTitle(title: string): boolean {
  return title.startsWith(AUTO_BRACKET_TITLE_PREFIX);
}

export function formatAutoBracketGroupTitleSuffix(
  division: EventDivisionDisplayInput,
): string {
  const parts = resolveDivisionDisplayParts(division);
  const segments: string[] = [];
  if (parts.ageGroup) segments.push(parts.ageGroup);
  if (parts.genderLabel) segments.push(parts.genderLabel);
  if (parts.weightChipLabel) segments.push(parts.weightChipLabel);
  return segments.join(" ");
}

export function formatAutoBracketGroupTitle(
  division: EventDivisionDisplayInput,
): string {
  return `${AUTO_BRACKET_TITLE_PREFIX}${formatAutoBracketGroupTitleSuffix(division)}`;
}

/** 저장된 title은 유지하고, 자동 생성 title만 division 기준으로 읽기 쉽게 표시 */
export function formatBracketTitleForDisplay(
  title: string,
  division?: EventDivisionDisplayInput | null,
): string {
  if (!isAutoGeneratedBracketTitle(title)) return title;
  if (division) return formatAutoBracketGroupTitle(division);
  return title;
}

/** 계체 자동 판정용 — 체중 기준이 포함된 문자열을 반환한다. */
export function resolveWeighInWeightLabel(
  division: EventDivisionWeightInput,
): string | null {
  return resolveDivisionWeightLabel(division);
}
