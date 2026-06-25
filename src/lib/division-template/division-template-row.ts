import type { DivisionTemplateItemInput } from "@/lib/validators/division-template.validator";
import {
  DIVISION_TEMPLATE_SPORT_LABELS,
  type DivisionTemplateSportType,
} from "@/lib/division-template/division-template-constants";
import { parseSingleWeightEntry } from "@/lib/division-template/division-template-parse";

export type EventDivisionFromTemplateRow = {
  sportType: string;
  ruleType: string | null;
  gender: string | null;
  ageGroup: string | null;
  weightClass: string | null;
  weightClassName: string | null;
  weightLimitText: string | null;
  skillLevel: string | null;
};

/** 중복 판별 — sportType · gender · ageGroup · weightClass */
export function normalizeEventDivisionKey(d: {
  sportType: string;
  gender?: string | null;
  ageGroup?: string | null;
  weightClass?: string | null;
}): string {
  return JSON.stringify({
    sportType: d.sportType.trim(),
    gender: d.gender?.trim() || "",
    ageGroup: d.ageGroup?.trim() || "",
    weightClass: d.weightClass?.trim() || "",
  });
}

export function resolveTemplateSportTypeLabel(
  sportType: string | null | undefined,
): string {
  if (!sportType?.trim()) return "";
  const key = sportType.trim() as DivisionTemplateSportType;
  return DIVISION_TEMPLATE_SPORT_LABELS[key] ?? sportType.trim();
}

/** 템플릿 항목의 체급명·체중 기준·표시 문자열을 동기화한다. */
export function normalizeTemplateItemWeight(
  item: DivisionTemplateItemInput,
): DivisionTemplateItemInput {
  const name = item.weightClassName?.trim() ?? "";
  const limit = item.weightLimitText?.trim() ?? "";

  if (name || limit) {
    const weightClass = [name, limit].filter(Boolean).join(" ").trim() || null;
    return {
      ...item,
      weightClassName: name || null,
      weightLimitText: limit || null,
      weightClass,
    };
  }

  const legacy = item.weightClass?.trim();
  if (!legacy) {
    return {
      ...item,
      weightClassName: item.weightClassName?.trim() || null,
      weightLimitText: item.weightLimitText?.trim() || null,
      weightClass: null,
    };
  }

  const parsed = parseSingleWeightEntry(legacy);
  const parsedName = parsed.weightClassName?.trim() ?? "";
  const parsedLimit = parsed.weightLimitText?.trim() ?? "";

  if (parsedLimit) {
    const weightClass =
      [parsedName, parsedLimit].filter(Boolean).join(" ").trim() || legacy;
    return {
      ...item,
      weightClassName: parsedName || null,
      weightLimitText: parsedLimit,
      weightLimitKg: parsed.weightLimitKg ?? item.weightLimitKg ?? null,
      limitType: parsed.limitType ?? item.limitType ?? null,
      weightClass,
    };
  }

  return {
    ...item,
    weightClassName: parsedName || legacy,
    weightLimitText: null,
    weightClass: legacy,
  };
}

export function buildWeightClassDisplay(
  item: DivisionTemplateItemInput,
): string {
  return normalizeTemplateItemWeight(item).weightClass?.trim() ?? "";
}

export function itemToEventDivisionRow(
  templateSportType: string | null,
  item: DivisionTemplateItemInput,
): EventDivisionFromTemplateRow | null {
  if (item.isActive === false) return null;

  const sportType =
    templateSportType?.trim() || item.sportType?.trim() || "";
  if (!sportType) return null;

  const normalized = normalizeTemplateItemWeight(item);
  const weightClass = normalized.weightClass?.trim() ?? "";
  if (!weightClass) return null;

  return {
    sportType,
    ruleType: normalized.ruleType?.trim() || null,
    gender: normalized.gender?.trim() || null,
    ageGroup: normalized.ageGroup?.trim() || null,
    weightClass,
    weightClassName: normalized.weightClassName?.trim() || null,
    weightLimitText: normalized.weightLimitText?.trim() || null,
    skillLevel: normalized.skillLevel?.trim() || null,
  };
}

export function sortTemplateItems(
  items: DivisionTemplateItemInput[],
): DivisionTemplateItemInput[] {
  return [...items].sort((a, b) => {
    const ageA = a.ageGroup ?? "";
    const ageB = b.ageGroup ?? "";
    if (ageA !== ageB) return ageA.localeCompare(ageB, "ko");
    const genderA = a.gender ?? "";
    const genderB = b.gender ?? "";
    if (genderA !== genderB) return genderA.localeCompare(genderB);
    const orderA = a.displayOrder ?? 0;
    const orderB = b.displayOrder ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return buildWeightClassDisplay(a).localeCompare(
      buildWeightClassDisplay(b),
      "ko",
    );
  });
}

export function sanitizeTemplateItems(
  rows: DivisionTemplateItemInput[],
  templateSportType?: string | null,
): DivisionTemplateItemInput[] {
  const sportFallback = templateSportType?.trim() || "";
  return rows
    .map((row, idx) =>
      normalizeTemplateItemWeight({
        ...row,
        sportType: row.sportType?.trim() || sportFallback,
        displayOrder: row.displayOrder ?? idx,
        isActive: row.isActive !== false,
      }),
    )
    .filter((row) => {
      if (row.isActive === false) return true;
      return Boolean(row.sportType?.trim() && buildWeightClassDisplay(row));
    });
}
