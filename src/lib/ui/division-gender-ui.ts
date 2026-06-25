/** 경기구분·체급 화면 — 연령부 내 성별 컬럼 색상 SSOT (CSS variable 참조) */

import type { DivisionTemplateGender } from "@/lib/division-template/division-template-constants";
import { cn } from "@/lib/utils";

export type DivisionGenderTone = "male" | "female" | "unknown";

export type DivisionGenderUiToken = {
  label: string;
  columnClassName: string;
  headerClassName: string;
  headerAccentClassName: string;
  listHeaderClassName: string;
  addRowBorderClassName: string;
};

export const divisionGenderUiTokens: Record<
  DivisionGenderTone,
  DivisionGenderUiToken
> = {
  male: {
    label: "남성",
    columnClassName:
      "rounded-md bg-[var(--division-gender-male-bg)] xl:rounded-lg",
    headerClassName:
      "flex items-center gap-2 border-b border-[var(--division-gender-male-border)] bg-[var(--division-gender-male-bg)] px-2 py-2 text-sm font-semibold text-[var(--division-gender-male-text)]",
    headerAccentClassName:
      "h-4 w-1 shrink-0 rounded-full bg-[var(--division-gender-male-accent)]",
    listHeaderClassName:
      "bg-[var(--division-gender-male-bg)] text-[var(--division-gender-male-text)]/80",
    addRowBorderClassName: "border-[var(--division-gender-male-border)]",
  },
  female: {
    label: "여성",
    columnClassName:
      "rounded-md bg-[var(--division-gender-female-bg)] xl:rounded-lg",
    headerClassName:
      "flex items-center gap-2 border-b border-[var(--division-gender-female-border)] bg-[var(--division-gender-female-bg)] px-2 py-2 text-sm font-semibold text-[var(--division-gender-female-text)]",
    headerAccentClassName:
      "h-4 w-1 shrink-0 rounded-full bg-[var(--division-gender-female-accent)]",
    listHeaderClassName:
      "bg-[var(--division-gender-female-bg)] text-[var(--division-gender-female-text)]/80",
    addRowBorderClassName: "border-[var(--division-gender-female-border)]",
  },
  unknown: {
    label: "성별 미지정",
    columnClassName:
      "rounded-md bg-[var(--division-gender-unknown-bg)] xl:rounded-lg",
    headerClassName:
      "flex items-center gap-2 border-b border-[var(--division-gender-unknown-border)] bg-[var(--division-gender-unknown-bg)] px-2 py-2 text-sm font-medium text-[var(--division-gender-unknown-text)]",
    headerAccentClassName:
      "h-4 w-1 shrink-0 rounded-full bg-[var(--division-gender-unknown-accent)]",
    listHeaderClassName:
      "bg-[var(--division-gender-unknown-bg)] text-[var(--division-gender-unknown-text)]/80",
    addRowBorderClassName: "border-[var(--division-gender-unknown-border)]",
  },
};

export const divisionListRowGridClass =
  "grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.75fr)_minmax(0,0.65fr)_minmax(0,0.65fr)_auto] md:items-center md:gap-2";

export const divisionListHeaderBaseClass = cn(
  divisionListRowGridClass,
  "mb-1 hidden border-b pb-2 text-xs font-medium md:grid",
);

export const divisionListRowBaseClass = cn(
  divisionListRowGridClass,
  "group border-b border-[var(--division-section-divider)] px-1 py-2 transition-colors last:border-b-0 hover:bg-[var(--division-row-hover-bg)]",
);

export const divisionGenderColumnDividerClass =
  "hidden w-px shrink-0 self-stretch bg-[var(--division-gender-column-divider)] xl:block";

export const divisionAgeGroupSectionClass =
  "space-y-5 border-b border-[var(--division-section-divider)] pb-10 last:border-b-0 last:pb-0";

export function resolveDivisionGenderTone(
  gender: DivisionTemplateGender | null | undefined,
): DivisionGenderTone {
  if (gender === "male") return "male";
  if (gender === "female") return "female";
  return "unknown";
}

export function getDivisionGenderUiToken(
  gender: DivisionTemplateGender | null | undefined,
): DivisionGenderUiToken {
  return divisionGenderUiTokens[resolveDivisionGenderTone(gender)];
}
