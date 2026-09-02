import { sanitizePrintFilenamePart } from "@/lib/brackets/bracket-print-format";
import type {
  JudgeScoreSheetJudgeNumber,
  JudgeScoreSheetMatchDto,
  JudgeScoreSheetPageDto,
} from "@/lib/judge-score-sheet/types";
import { JUDGE_SCORE_SHEET_JUDGE_NUMBERS } from "@/lib/judge-score-sheet/types";

export function parseJudgeScoreSheetJudgesParam(
  raw: string | null | undefined,
): JudgeScoreSheetJudgeNumber[] {
  if (!raw?.trim()) return [...JUDGE_SCORE_SHEET_JUDGE_NUMBERS];
  const set = new Set<JudgeScoreSheetJudgeNumber>();
  for (const part of raw.split(/[,|]/)) {
    const n = Number(part.trim());
    if (n === 1 || n === 2 || n === 3) set.add(n);
  }
  const ordered = JUDGE_SCORE_SHEET_JUDGE_NUMBERS.filter((j) => set.has(j));
  return ordered.length > 0 ? ordered : [...JUDGE_SCORE_SHEET_JUDGE_NUMBERS];
}

export function judgeScoreSheetTitle(judgeNumber: JudgeScoreSheetJudgeNumber): string {
  return `${judgeNumber}심판 채점표`;
}

/**
 * Combined PDF order: all matches for judge 1, then judge 2, then judge 3.
 * One page = one match × one judge.
 */
export function buildJudgeScoreSheetPages(
  matches: JudgeScoreSheetMatchDto[],
  judges: JudgeScoreSheetJudgeNumber[],
): JudgeScoreSheetPageDto[] {
  const pages: JudgeScoreSheetPageDto[] = [];
  for (const judgeNumber of judges) {
    for (const match of matches) {
      pages.push({
        judgeNumber,
        judgeTitle: judgeScoreSheetTitle(judgeNumber),
        match,
      });
    }
  }
  return pages;
}

export function buildJudgeScoreSheetFilename(params: {
  eventName: string;
  judges: JudgeScoreSheetJudgeNumber[];
}): string {
  const safe = sanitizePrintFilenamePart(params.eventName);
  if (params.judges.length === 1) {
    return `${safe}_${params.judges[0]}심판_채점표.pdf`;
  }
  if (
    params.judges.length === 3 &&
    params.judges[0] === 1 &&
    params.judges[1] === 2 &&
    params.judges[2] === 3
  ) {
    return `${safe}_심판채점표_전체.pdf`;
  }
  const label = params.judges.map((j) => `${j}심판`).join("_");
  return `${safe}_${label}_채점표.pdf`;
}

export function buildJudgeScoreSheetDocumentTitle(params: {
  eventName: string;
  judges: JudgeScoreSheetJudgeNumber[];
}): string {
  const safe = sanitizePrintFilenamePart(params.eventName);
  if (params.judges.length === 1) {
    return `${safe}_${params.judges[0]}심판_채점표`;
  }
  return `${safe}_심판채점표`;
}

/** Round rows for score table: 1R..NR + 합계 */
export function buildJudgeScoreSheetRoundLabels(roundCount: number): string[] {
  const n = Math.max(1, Math.min(12, Math.round(roundCount || 3)));
  const rows = Array.from({ length: n }, (_, i) => `${i + 1}R`);
  rows.push("합계");
  return rows;
}

/**
 * Scorable match for judge sheet:
 * - not cancelled
 * - both corners assigned (BYE / unassigned excluded)
 */
export function isJudgeScoreSheetEligibleMatch(match: {
  status: string;
  fighterRedId: string | null;
  fighterBlueId: string | null;
}): boolean {
  if (match.status === "cancelled") return false;
  if (!match.fighterRedId || !match.fighterBlueId) return false;
  return true;
}
