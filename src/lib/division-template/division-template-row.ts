import type { DivisionTemplateItemInput } from "@/lib/validators/division-template.validator";
import {
  DIVISION_TEMPLATE_SPORT_LABELS,
  type DivisionTemplateSportType,
} from "@/lib/division-template/division-template-constants";

export type EventDivisionFromTemplateRow = {
  sportType: string;
  ruleType: string | null;
  gender: string | null;
  ageGroup: string | null;
  weightClass: string | null;
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

export function buildWeightClassDisplay(
  item: DivisionTemplateItemInput,
): string {
  if (item.weightClass?.trim()) return item.weightClass.trim();
  const name = item.weightClassName?.trim() ?? "";
  const limit = item.weightLimitText?.trim() ?? "";
  return [name, limit].filter(Boolean).join(" ").trim();
}

export function itemToEventDivisionRow(
  templateSportType: string | null,
  item: DivisionTemplateItemInput,
): EventDivisionFromTemplateRow | null {
  if (item.isActive === false) return null;

  const sportType =
    templateSportType?.trim() || item.sportType?.trim() || "";
  if (!sportType) return null;

  const weightClass = buildWeightClassDisplay(item);
  if (!weightClass) return null;

  return {
    sportType,
    ruleType: item.ruleType?.trim() || null,
    gender: item.gender?.trim() || null,
    ageGroup: item.ageGroup?.trim() || null,
    weightClass,
    skillLevel: item.skillLevel?.trim() || null,
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
    .map((row, idx) => ({
      ...row,
      sportType: row.sportType?.trim() || sportFallback,
      displayOrder: row.displayOrder ?? idx,
      isActive: row.isActive !== false,
    }))
    .filter((row) => {
      if (row.isActive === false) return true;
      return Boolean(row.sportType?.trim() && buildWeightClassDisplay(row));
    });
}
