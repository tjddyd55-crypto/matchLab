import type { DivisionTemplateItemInput } from "@/lib/validators/division-template.validator";
import type {
  DivisionTemplateAgeGroup,
  DivisionTemplateGender,
} from "@/lib/division-template/division-template-constants";

export type ParsedQuickWeightRow = {
  weightClassName: string;
  weightLimitText: string | null;
  weightLimitKg: number | null;
  limitType: "under" | "over" | "range" | null;
  parseError?: string;
};

const WEIGHT_ENTRY_RE =
  /^(.+?)\s*([+-]?\d+(?:\.\d+)?)\s*kg\s*$/i;

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
    weightLimitText = `+${weightLimitKg}kg`;
  } else if (numRaw.startsWith("-")) {
    limitType = "under";
    weightLimitKg = Math.abs(numeric);
    weightLimitText = `-${weightLimitKg}kg`;
  } else {
    limitType = signed ? "under" : "under";
    weightLimitKg = Math.abs(numeric);
    weightLimitText = `-${weightLimitKg}kg`;
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
