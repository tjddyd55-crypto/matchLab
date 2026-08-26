/**
 * 시합 대진표 / 미매칭 선수 출력 — 순수 포맷터 (DB/IO 없음)
 */
import { formatSchoolGradeCompactLabel } from "@/lib/fighter/record";
import { formatPreviewApplicationRecord } from "@/lib/brackets/explain-record-unmatched";
import { formatMatchOrderShort } from "@/lib/match-order-display";
import { resolveApplicationGymDisplayName } from "@/lib/gym/external-registration-placeholder-gym";

/** A4 운영용 대진표 — Figma 밀도 기준 10경기/page */
export const BRACKET_PRINT_MATCHES_PER_PAGE = 10;
/** 미매칭 명단 — 20명/page (A4 세로) */
export const UNMATCHED_PRINT_ROWS_PER_PAGE = 20;

export type BracketPrintFighterDto = {
  name: string;
  gymName: string;
  weightLabel: string | null;
  gradeLabel: string | null;
  recordLabel: string;
  /** PDF 카드: "현재 무전" / "현재 2전 1승 1패" */
  recordDisplayLabel: string;
  identityLine: string;
  /** all-matches card layout */
  genderLabel?: string | null;
};

export type BracketPrintMatchDto = {
  matchId: string;
  matchNoLabel: string;
  /** organizerMemo에서 추출한 kg (예: "68kg"). 없으면 null */
  weightLabel?: string | null;
  divisionLabel: string | null;
  arenaName: string | null;
  red: BracketPrintFighterDto | null;
  blue: BracketPrintFighterDto | null;
  /** all-matches mode only */
  roundLabel?: string | null;
  timeLabel?: string | null;
  /** compact ops line: 제1경기장 · 2R · 3:00 */
  opsLine?: string | null;
  organizerMemo?: string | null;
};

export type BracketPrintMode = "court" | "all-matches";

export type BracketPrintPageDto = {
  pageIndex: number;
  pageCount: number;
  matchRangeLabel: string | null;
  matches: BracketPrintMatchDto[];
};

export type BracketPrintDocumentDto = {
  eventId: string;
  eventName: string;
  eventDateLabel: string | null;
  venueLabel: string | null;
  documentTitle: string;
  matches: BracketPrintMatchDto[];
  pages: BracketPrintPageDto[];
  mode?: BracketPrintMode;
  footerNote: string;
};

export type UnmatchedPrintRowDto = {
  index: number;
  gymName: string;
  fighterName: string;
  genderLabel: string;
  divisionLabel: string;
  recordLabel: string;
  weightLabel: string;
};

export type UnmatchedPrintPageDto = {
  pageIndex: number;
  pageCount: number;
  rangeLabel: string;
  rows: UnmatchedPrintRowDto[];
};

export type UnmatchedPrintDocumentDto = {
  eventId: string;
  eventName: string;
  documentTitle: string;
  totalCount: number;
  pages: UnmatchedPrintPageDto[];
  footerNote: string;
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
  genderLabel?: string | null;
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

  const dto: BracketPrintFighterDto = {
    name: input.name.trim() || "미정",
    gymName,
    weightLabel,
    gradeLabel,
    recordLabel: normalizedRecord,
    recordDisplayLabel: formatBracketPrintRecordDisplay(normalizedRecord),
    identityLine: "",
    genderLabel: input.genderLabel?.trim() || null,
  };
  dto.identityLine = buildBracketPrintFighterIdentityLine(dto);
  return dto;
}

/** PDF 카드용 전적 — "현재 무전" / "현재 2전 1승 1패" */
export function formatBracketPrintRecordDisplay(recordLabel: string): string {
  const t = recordLabel.trim();
  if (!t || t === "-") return "현재 전적 미상";
  if (t.startsWith("현재 ")) return t;
  return `현재 ${t}`;
}

export function formatPrintGenderShort(
  gender: string | null | undefined,
): string {
  const g = (gender ?? "").trim().toLowerCase();
  if (g === "male" || g === "m" || g === "남" || g === "남성") return "남";
  if (g === "female" || g === "f" || g === "여" || g === "여성") return "여";
  return "-";
}

export function sanitizePrintFilenamePart(raw: string): string {
  return (
    raw
      .trim()
      .replace(/\s+/g, "")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .slice(0, 80) || "대회"
  );
}

export function chunkItemsForPrintPages<T>(
  items: T[],
  perPage: number,
): T[][] {
  const size = Math.max(1, perPage);
  if (items.length === 0) return [];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

export function buildBracketPrintPages(
  matches: BracketPrintMatchDto[],
  perPage: number = BRACKET_PRINT_MATCHES_PER_PAGE,
): BracketPrintPageDto[] {
  const chunks = chunkItemsForPrintPages(matches, perPage);
  if (chunks.length === 0) {
    return [
      {
        pageIndex: 1,
        pageCount: 1,
        matchRangeLabel: null,
        matches: [],
      },
    ];
  }
  const pageCount = chunks.length;
  return chunks.map((pageMatches, idx) => {
    const first = pageMatches[0]?.matchNoLabel?.replace(/경기$/, "") ?? "";
    const last =
      pageMatches[pageMatches.length - 1]?.matchNoLabel?.replace(/경기$/, "") ??
      "";
    const matchRangeLabel =
      first && last
        ? first === last
          ? `${first}경기`
          : `${first}~${last}경기`
        : null;
    return {
      pageIndex: idx + 1,
      pageCount,
      matchRangeLabel,
      matches: pageMatches,
    };
  });
}

export function buildUnmatchedPrintPages(
  rows: UnmatchedPrintRowDto[],
  perPage: number = UNMATCHED_PRINT_ROWS_PER_PAGE,
): UnmatchedPrintPageDto[] {
  const chunks = chunkItemsForPrintPages(rows, perPage);
  const total = rows.length;
  if (chunks.length === 0) {
    return [
      {
        pageIndex: 1,
        pageCount: 1,
        rangeLabel: "총 0명",
        rows: [],
      },
    ];
  }
  const pageCount = chunks.length;
  return chunks.map((pageRows, idx) => {
    const start = idx * perPage + 1;
    const end = start + pageRows.length - 1;
    return {
      pageIndex: idx + 1,
      pageCount,
      rangeLabel:
        pageCount === 1
          ? `신청선수 기준 · 총 ${total}명`
          : `총 ${total}명 중 ${start}~${end}`,
      rows: pageRows,
    };
  });
}

export const BRACKET_PRINT_FOOTER_NOTE =
  "※ 경기 순서 및 경기 정보는 운영 상황에 따라 변경될 수 있습니다.";

export const UNMATCHED_PRINT_FOOTER_NOTE =
  "※ 요청 항목만 표시: 체육관명, 선수명, 성별, 경기구분, 전적, 신청 체중";

/** all-matches 카드: 남성 · 66kg · 중2 · 무전 */
export function buildBracketPrintFighterMetaLine(
  fighter: BracketPrintFighterDto | null,
): string | null {
  if (!fighter) return null;
  const parts = [
    fighter.genderLabel,
    fighter.weightLabel,
    fighter.gradeLabel,
    fighter.recordLabel && fighter.recordLabel !== "-"
      ? fighter.recordLabel
      : null,
  ].filter((x): x is string => Boolean(x && x.trim()));
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function buildAllMatchesPrintOpsLine(input: {
  arenaName: string | null;
  roundLabel: string | null;
  timeLabel: string | null;
}): string | null {
  const parts = [input.arenaName, input.roundLabel, input.timeLabel].filter(
    (x): x is string => Boolean(x && x.trim()),
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function buildBracketPrintDocumentTitle(
  eventName: string,
  mode: BracketPrintMode = "court",
): string {
  const safe = sanitizePrintFilenamePart(eventName);
  if (mode === "all-matches") {
    return `MATCHON_${safe}_대진표`;
  }
  return `MATCHON_${safe}_대진표`;
}

export function buildUnmatchedPrintDocumentTitle(eventName: string): string {
  const safe = sanitizePrintFilenamePart(eventName);
  return `MATCHON_${safe}_미매칭선수`;
}

export function formatBracketPrintEventDate(d: Date | null | undefined): string | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export { formatMatchOrderShort };
