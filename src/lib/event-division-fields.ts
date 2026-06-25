import { parseSingleWeightEntry } from "@/lib/division-template/division-template-parse";
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

/** 체급명·체중 기준·표시용 weightClass를 일관되게 해석한다. */
export function resolveEventDivisionWeightFields(
  division: EventDivisionWeightInput,
): EventDivisionWeightFields {
  const name = division.weightClassName?.trim() || null;
  const limit = division.weightLimitText?.trim() || null;

  if (name || limit) {
    const weightClass = [name, limit].filter(Boolean).join(" ").trim() || null;
    return { weightClassName: name, weightLimitText: limit, weightClass };
  }

  const legacy = division.weightClass?.trim() || null;
  if (!legacy) {
    return { weightClassName: null, weightLimitText: null, weightClass: null };
  }

  const parsed = parseSingleWeightEntry(legacy);
  const parsedName = parsed.weightClassName?.trim() || null;
  const parsedLimit = parsed.weightLimitText?.trim() || null;

  if (parsedLimit) {
    const weightClass =
      [parsedName, parsedLimit].filter(Boolean).join(" ").trim() || legacy;
    return {
      weightClassName: parsedName,
      weightLimitText: parsedLimit,
      weightClass,
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
  sportRuleLabel: string | null;
};

const AUTO_BRACKET_TITLE_PREFIX = "자동 생성 · ";

/** 체급 chip용 — weightClassName + weightLimitText, legacy weightClass fallback */
export function formatDivisionWeightChipLabel(
  division: EventDivisionWeightInput,
): string | null {
  const fields = resolveEventDivisionWeightFields(division);
  if (fields.weightClassName && fields.weightLimitText) {
    return `${fields.weightClassName} ${fields.weightLimitText}`;
  }
  if (fields.weightClassName) return fields.weightClassName;
  if (fields.weightLimitText) return fields.weightLimitText;
  return fields.weightClass;
}

export function formatDivisionSportRuleLabel(d: {
  sportType?: string | null;
  ruleType?: string | null;
}): string | null {
  const label = [d.sportType?.trim(), d.ruleType?.trim()]
    .filter((x): x is string => Boolean(x))
    .join(" · ");
  return label || null;
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
    sportRuleLabel: formatDivisionSportRuleLabel(division),
  };
}

/** 경기 카드 compact 한 줄 — U16 · 남성 · -60kg · intermediate */
export function formatDivisionCompactLine(
  division: EventDivisionDisplayInput,
): string {
  const parts = resolveDivisionDisplayParts(division);
  return [
    parts.ageGroup,
    parts.genderLabel,
    parts.weightChipLabel,
    parts.skillLevel,
  ]
    .filter((x): x is string => Boolean(x))
    .join(" · ");
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
  if (parts.skillLevel) segments.push(parts.skillLevel);
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
  const fields = resolveEventDivisionWeightFields(division);
  if (fields.weightLimitText) {
    return fields.weightClassName
      ? `${fields.weightClassName} ${fields.weightLimitText}`
      : fields.weightLimitText;
  }
  return fields.weightClass;
}
