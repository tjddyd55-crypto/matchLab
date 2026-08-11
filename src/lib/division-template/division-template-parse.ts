import type { DivisionTemplateItemInput } from "@/lib/validators/division-template.validator";
import type {
  DivisionTemplateAgeGroup,
  DivisionTemplateGender,
} from "@/lib/division-template/division-template-constants";

export type WeightLimitOperator = "under" | "over";

export type ParsedQuickWeightRow = {
  weightClassName: string;
  weightLimitText: string | null;
  weightLimitKg: number | null;
  limitType: "under" | "over" | "range" | null;
  parseError?: string;
};

/** 소수(63.5)를 문자열로 안정 보존한다. */
export function formatWeightKgNumber(kg: number): string {
  if (!Number.isFinite(kg)) return "";
  // toString은 63.5를 유지하고, 불필요한 trailing zero를 만들지 않는다.
  return String(kg);
}

export function formatWeightLimitText(
  kg: number,
  operator: WeightLimitOperator,
): string {
  const n = formatWeightKgNumber(kg);
  return operator === "over" ? `+${n}kg` : `-${n}kg`;
}

const WEIGHT_ENTRY_RE =
  /^(.+?)\s*([+-]?\d+(?:\.\d+)?)\s*kg\s*$/i;

/**
 * 체중 기준 입력값을 표시용 문자열로 보정한다.
 * 54 → -54kg, -54 → -54kg, 54kg → 54kg, -54kg → -54kg
 */
export function normalizeWeightLimitInput(raw: string): string {
  const text = raw.trim();
  if (!text) return "";

  if (/kg\s*$/i.test(text)) {
    const numMatch = text.match(/^([+-]?\d+(?:\.\d+)?)\s*kg\s*$/i);
    if (numMatch) {
      const num = numMatch[1]!;
      if (num.startsWith("+")) return `+${num.slice(1)}kg`;
      if (num.startsWith("-")) return `${num}kg`;
      return `-${num}kg`;
    }
    return text.replace(/\s*kg\s*$/i, "kg");
  }

  const bare = text.match(/^([+-]?\d+(?:\.\d+)?)$/);
  if (bare) {
    const num = bare[1]!;
    if (num.startsWith("+")) return `+${num.slice(1)}kg`;
    if (num.startsWith("-")) return `${num}kg`;
    return `-${num}kg`;
  }

  return text;
}

export function parseSingleWeightEntry(raw: string): ParsedQuickWeightRow {
  const text = raw.trim();
  if (!text) {
    return {
      weightClassName: "",
      weightLimitText: null,
      weightLimitKg: null,
      limitType: null,
      parseError: "빈 항목",
    };
  }

  const match = text.match(WEIGHT_ENTRY_RE);
  if (!match) {
    return {
      weightClassName: text,
      weightLimitText: null,
      weightLimitKg: null,
      limitType: null,
    };
  }

  const weightClassName = match[1].trim();
  const numRaw = match[2];
  const signed = numRaw.startsWith("+") || numRaw.startsWith("-");
  const numeric = Number.parseFloat(numRaw);
  if (!Number.isFinite(numeric)) {
    return {
      weightClassName: text,
      weightLimitText: null,
      weightLimitKg: null,
      limitType: null,
      parseError: "체중 숫자를 해석하지 못했습니다.",
    };
  }

  let limitType: "under" | "over" | "range" | null = "under";
  let weightLimitText: string;
  let weightLimitKg: number;

  if (numRaw.startsWith("+")) {
    limitType = "over";
    weightLimitKg = Math.abs(numeric);
    weightLimitText = formatWeightLimitText(weightLimitKg, "over");
  } else if (numRaw.startsWith("-")) {
    limitType = "under";
    weightLimitKg = Math.abs(numeric);
    weightLimitText = formatWeightLimitText(weightLimitKg, "under");
  } else {
    limitType = signed ? "under" : "under";
    weightLimitKg = Math.abs(numeric);
    weightLimitText = formatWeightLimitText(weightLimitKg, "under");
  }

  return {
    weightClassName,
    weightLimitText,
    weightLimitKg,
    limitType,
  };
}

export function parseQuickWeightClassInput(
  text: string,
  context: {
    ageGroup: DivisionTemplateAgeGroup | string;
    gender: DivisionTemplateGender;
    sportType: string;
    startOrder?: number;
  },
): DivisionTemplateItemInput[] {
  const parts = text
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);

  let order = context.startOrder ?? 0;

  return parts.map((part) => {
    const parsed = parseSingleWeightEntry(part);
    const row: DivisionTemplateItemInput = {
      sportType: context.sportType,
      ruleType: null,
      gender: context.gender,
      ageGroup: context.ageGroup,
      weightClassName: parsed.weightClassName,
      weightLimitText: parsed.weightLimitText,
      weightLimitKg: parsed.weightLimitKg,
      limitType: parsed.limitType,
      weightClass: parsed.weightLimitText
        ? `${parsed.weightClassName} ${parsed.weightLimitText}`.trim()
        : parsed.weightClassName,
      skillLevel: null,
      displayOrder: order,
      isActive: true,
    };
    order += 1;
    return row;
  });
}
