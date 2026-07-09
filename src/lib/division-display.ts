import type { BracketType } from "@/lib/enums";
import {
  type EventDivisionDisplayInput,
  type EventDivisionWeightInput,
  resolveEventDivisionWeightFields,
} from "@/lib/event-division-fields";
import { resolveBoutFormatKind, boutFormatLabel } from "@/lib/bout-format";
import {
  formatOperationalSettingsLabel,
  type MatchOperationalSettings,
} from "@/lib/match-operational-settings";

const COMPACT_GENDER_LABELS: Record<string, string> = {
  male: "남",
  female: "여",
  m: "남",
  f: "여",
  남성: "남",
  여성: "여",
  mixed: "혼성",
  혼성: "혼성",
};

/** 심판·대진표 row용 성별 — 남/여 */
export function formatDivisionGenderCompactLabel(
  gender: string | null | undefined,
): string | null {
  const value = gender?.trim();
  if (!value) return null;
  return COMPACT_GENDER_LABELS[value] ?? value;
}

/** 체급명 + 체중 기준 — "플라이 -60kg" */
export function formatDivisionWeightSegment(
  division: EventDivisionWeightInput,
): string | null {
  const fields = resolveEventDivisionWeightFields(division);
  const name = fields.weightClassName;
  const limit = fields.weightLimitText;

  if (name && limit) return `${name} ${limit}`;
  if (limit) return limit;
  if (name) return name;
  return fields.weightClass;
}

/**
 * 체급/부문 메인 라벨 SSOT — "U16 남 플라이 -60kg"
 * 종목·라운드·원매치 정보는 포함하지 않는다.
 */
export function formatDivisionLabel(
  division: EventDivisionDisplayInput,
): string {
  const parts = [
    division.ageGroup?.trim() || null,
    formatDivisionGenderCompactLabel(division.gender),
    formatDivisionWeightSegment(division),
  ].filter((part): part is string => Boolean(part));

  return parts.join(" ");
}

/** 경기 설정 라벨 — "원매치 · 3R · 3:00" */
export function formatBoutSettingsLabel(input: {
  bracketType: BracketType | string;
  bracketIsPublic?: boolean | null;
  matchIsPublicSparring?: boolean | null;
  resultMemo?: string | null;
  settings: MatchOperationalSettings;
}): string {
  const kind = resolveBoutFormatKind({
    bracketType: input.bracketType,
    bracketIsPublic: input.bracketIsPublic,
    matchIsPublicSparring: input.matchIsPublicSparring,
    resultMemo: input.resultMemo,
  });
  const bout = boutFormatLabel(kind);
  const rounds = formatOperationalSettingsLabel(input.settings);
  return `${bout} · ${rounds}`;
}
