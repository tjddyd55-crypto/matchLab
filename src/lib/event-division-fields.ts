import { parseSingleWeightEntry } from "@/lib/division-template/division-template-parse";
import { DIVISION_TEMPLATE_GENDER_LABELS } from "@/lib/division-template/division-template-constants";

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
