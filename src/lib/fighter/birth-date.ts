import { formatUtcDateOnly, parseDateOnlyString } from "@/lib/date-only";
import { parseApplicantBirthDate } from "@/lib/applicant-excel/normalize";

/** Fighter.birthDate 미입력 — placeholder 금지, null만 사용 */
export function formatFighterBirthDateDisplay(
  birthDate: Date | string | null | undefined,
  options?: { emptyLabel?: string; separator?: "." | "-" },
): string {
  if (!birthDate) return options?.emptyLabel ?? "미입력";
  return formatUtcDateOnly(birthDate, options?.separator ?? "-");
}

export function fighterBirthDateForPersist(
  iso: string | null | undefined,
): Date | null {
  const trimmed = (iso ?? "").trim();
  if (!trimmed) return null;
  const parsed = parseApplicantBirthDate(trimmed);
  if (!parsed) return null;
  return parseDateOnlyString(parsed);
}
