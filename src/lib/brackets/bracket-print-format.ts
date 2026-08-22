/**
 * 시합 대진표 출력 — 순수 포맷터 (DB/IO 없음)
 */
import { formatSchoolGradeCompactLabel } from "@/lib/fighter/record";
import { formatPreviewApplicationRecord } from "@/lib/brackets/explain-record-unmatched";
import { formatMatchOrderShort } from "@/lib/match-order-display";
import { resolveApplicationGymDisplayName } from "@/lib/gym/external-registration-placeholder-gym";

export type BracketPrintFighterDto = {
  name: string;
  gymName: string;
  weightLabel: string | null;
  gradeLabel: string | null;
  recordLabel: string;
  identityLine: string;
};

export type BracketPrintMatchDto = {
  matchId: string;
  matchNoLabel: string;
  divisionLabel: string | null;
  arenaName: string | null;
  red: BracketPrintFighterDto | null;
  blue: BracketPrintFighterDto | null;
};

export type BracketPrintDocumentDto = {
  eventId: string;
  eventName: string;
  eventDateLabel: string | null;
  venueLabel: string | null;
  documentTitle: string;
  matches: BracketPrintMatchDto[];
};

export function formatApplicationWeightLabel(
  kg: number | null | undefined,
): string | null {
  if (kg == null || !Number.isFinite(kg) || kg <= 0) return null;
  const rounded = Math.round(kg * 1000) / 1000;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(/\.?0+$/, "");
  return `${text}kg`;
}

export function parseApplicationWeightKgFromSnapshot(
  fighterSnapshot: unknown,
): number | null {
  if (!fighterSnapshot || typeof fighterSnapshot !== "object") return null;
  const raw = (fighterSnapshot as Record<string, unknown>).applicationWeightKg;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export function parseApplicantNameFromSnapshot(
  fighterSnapshot: unknown,
): string | null {
  if (!fighterSnapshot || typeof fighterSnapshot !== "object") return null;
  const name = (fighterSnapshot as Record<string, unknown>).name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return null;
}

export function buildBracketPrintFighterIdentityLine(input: {
  name: string;
  gymName: string;
  weightLabel: string | null;
  gradeLabel: string | null;
}): string {
  return [input.name, input.gymName, input.weightLabel, input.gradeLabel]
    .filter((x): x is string => Boolean(x && x.trim()))
    .join(" / ");
}

export function buildBracketPrintFighterDto(input: {
  name: string;
  gymNameSnapshot?: string | null;
  gymSnapshot?: unknown;
  gymRelationName?: string | null;
  fighterSnapshot?: unknown;
  schoolLevelSnapshot?: string | null;
  schoolGradeSnapshot?: number | null;
  totalBoutsSnapshot?: number | null;
  winsSnapshot?: number | null;
  drawsSnapshot?: number | null;
  lossesSnapshot?: number | null;
  recordText?: string | null;
  fighterRecord?: {
    recordTotalBouts: number;
    recordWin: number;
    recordLoss: number;
    recordDraw: number;
  } | null;
}): BracketPrintFighterDto {
  const gymName = resolveApplicationGymDisplayName({
    gymNameSnapshot: input.gymNameSnapshot,
    gymSnapshot: input.gymSnapshot,
    gymRelationName: input.gymRelationName,
  });
  const weightLabel = formatApplicationWeightLabel(
    parseApplicationWeightKgFromSnapshot(input.fighterSnapshot),
  );
  const gradeLabel = formatSchoolGradeCompactLabel({
    schoolLevel: input.schoolLevelSnapshot,
    schoolGrade: input.schoolGradeSnapshot,
  });
  const recordLabel = formatPreviewApplicationRecord({
    totalBoutsSnapshot: input.totalBoutsSnapshot ?? null,
    winsSnapshot: input.winsSnapshot ?? null,
    drawsSnapshot: input.drawsSnapshot ?? null,
    lossesSnapshot: input.lossesSnapshot ?? null,
    recordText: input.recordText,
    fighter: input.fighterRecord ?? null,
  });
  const normalizedRecord =
    recordLabel === "전적 정보 없음" ? "-" : recordLabel;

  const dto = {
    name: input.name.trim() || "미정",
    gymName,
    weightLabel,
    gradeLabel,
    recordLabel: normalizedRecord,
    identityLine: "",
  };
  dto.identityLine = buildBracketPrintFighterIdentityLine(dto);
  return dto;
}

export function buildBracketPrintDocumentTitle(eventName: string): string {
  const safe = eventName.trim().replace(/[\\/:*?"<>|]+/g, "_") || "대회";
  return `MATCHON_${safe}_시합대진표`;
}

export function formatBracketPrintEventDate(d: Date | null | undefined): string | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export { formatMatchOrderShort };
