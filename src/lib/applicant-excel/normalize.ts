import {
  isDateOnlyNotAfterToday,
  isValidDateOnlyString,
  parseDateOnlyString,
} from "@/lib/date-only";
import { normalizeWeightLimitDisplayText } from "@/lib/event-division-fields";
import { parseSingleWeightEntry } from "@/lib/division-template/division-template-parse";

const GENDER_ALIASES: Record<string, "male" | "female"> = {
  남: "male",
  남성: "male",
  남자: "male",
  male: "male",
  m: "male",
  여: "female",
  여성: "female",
  여자: "female",
  female: "female",
  f: "female",
};

export function compactText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function foldKey(value: string): string {
  return compactText(value)
    .toLowerCase()
    .replace(/[·•]/g, "")
    .replace(/\s+/g, "");
}

export function parseApplicantGender(
  raw: string,
): { ok: true; gender: "male" | "female" } | { ok: false } {
  const key = foldKey(raw);
  const gender = GENDER_ALIASES[key];
  if (!gender) return { ok: false };
  return { ok: true, gender };
}

export function genderLabel(gender: "male" | "female"): string {
  return gender === "male" ? "남" : "여";
}

/** Excel 날짜·문자 → YYYY-MM-DD */
export function parseApplicantBirthDate(raw: string): string | null {
  const trimmed = compactText(raw);
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 8) {
    const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    if (isValidDateOnlyString(iso) && isDateOnlyNotAfterToday(iso)) return iso;
    return null;
  }
  const iso = trimmed.replace(/[./]/g, "-");
  if (isValidDateOnlyString(iso) && isDateOnlyNotAfterToday(iso)) return iso;
  return null;
}

export function birthDateToUtc(iso: string): Date {
  const parsed = parseDateOnlyString(iso);
  if (!parsed) {
    throw new Error("invalid birth date");
  }
  return parsed;
}

export function parseOptionalWeightKg(raw: string): {
  ok: boolean;
  kg: number | null;
  error?: string;
} {
  const trimmed = compactText(raw);
  if (!trimmed) return { ok: true, kg: null };
  const n = Number.parseFloat(trimmed.replace(/kg$/i, "").trim());
  if (!Number.isFinite(n) || n <= 0 || n > 300) {
    return { ok: false, kg: null, error: "체중이 올바른 숫자가 아닙니다." };
  }
  return { ok: true, kg: n };
}

/** 키(cm). `175` / `175cm` 허용. 비우면 null. */
export function parseOptionalHeightCm(raw: string): {
  ok: boolean;
  cm: number | null;
  error?: string;
} {
  const trimmed = compactText(raw);
  if (!trimmed) return { ok: true, cm: null };
  const n = Number.parseFloat(trimmed.replace(/cm$/i, "").trim());
  if (!Number.isFinite(n) || n < 50 || n > 250) {
    return { ok: false, cm: null, error: "키가 올바른 숫자가 아닙니다." };
  }
  return { ok: true, cm: n };
}

const SIGNED_WEIGHT_LIMIT_RE = /^[+-]\d+(?:\.\d+)?(?:\s*kg)?$/i;
const UNSIGNED_WEIGHT_RE = /^\d+(?:\.\d+)?(?:\s*kg)?$/i;
const INSIGNIFICANT_CLASS_NAMES = new Set(["-", "–", "—", "−", "+", "·", "•"]);

function cleanWeightClassName(name: string): string {
  const cleaned = compactText(name).replace(/[·•]+$/g, "").trim();
  if (!cleaned || INSIGNIFICANT_CLASS_NAMES.has(cleaned)) return "";
  return cleaned;
}

/**
 * 체급 칸 해석.
 * `-63.5kg` / `+91kg` 는 체중 기준만.
 * 부호 없는 `63.5` 는 체급으로 인정하지 않는다(자동 -63.5kg 변환 금지).
 */
export function splitWeightClassInput(raw: string): {
  name: string;
  limitText: string | null;
} {
  const trimmed = compactText(raw);
  if (!trimmed) return { name: "", limitText: null };
  if (SIGNED_WEIGHT_LIMIT_RE.test(trimmed)) {
    return {
      name: "",
      limitText: normalizeWeightLimitDisplayText(trimmed),
    };
  }
  if (UNSIGNED_WEIGHT_RE.test(trimmed)) {
    return { name: trimmed, limitText: null };
  }
  const parsed = parseSingleWeightEntry(trimmed);
  const name = cleanWeightClassName(parsed.weightClassName);
  const limit = parsed.weightLimitText
    ? normalizeWeightLimitDisplayText(parsed.weightLimitText)
    : null;
  if (name && limit) return { name, limitText: limit };
  if (!name && limit) return { name: "", limitText: limit };
  return { name: name || trimmed, limitText: limit };
}

export function sanitizePlainCell(value: string): string {
  const trimmed = compactText(value);
  if (/^[=+\-@]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}
