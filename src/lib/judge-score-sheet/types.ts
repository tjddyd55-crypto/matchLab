/**
 * Judge score sheet PDF — DTO only (no DB).
 *
 * Data SSOT (documented for QA):
 * - Match Number SSOT: BracketMatch.matchNumber (display via formatCourtScheduleMatchOrderShort)
 * - Venue SSOT: EventCourt.name → venueName (UI label: 장소)
 * - Division SSOT: formatDivisionMainLabel(Bracket.division) — same as bracket print
 * - RED SSOT: fighterRedSnapshot.name / gymName first, then live fighter name fallback
 * - BLUE SSOT: fighterBlueSnapshot.name / gymName first, then live fighter name fallback
 * - Sort SSOT: EventCourt.sortOrder → courtOrder (sortMatchesByCourtSchedule)
 */

export const JUDGE_SCORE_SHEET_JUDGE_NUMBERS = [1, 2, 3] as const;
export type JudgeScoreSheetJudgeNumber =
  (typeof JUDGE_SCORE_SHEET_JUDGE_NUMBERS)[number];

export type JudgeScoreSheetCornerDto = {
  name: string;
  gymName: string;
};

export type JudgeScoreSheetMatchDto = {
  matchId: string;
  /** Official display number — never renumbered for filters */
  matchNumber: number | null;
  matchNoLabel: string;
  venueName: string | null;
  venueId: string | null;
  divisionLabel: string | null;
  roundCount: number;
  red: JudgeScoreSheetCornerDto;
  blue: JudgeScoreSheetCornerDto;
};

export type JudgeScoreSheetVenueDto = {
  id: string;
  name: string;
  matchCount: number;
};

export type JudgeScoreSheetPageDto = {
  judgeNumber: JudgeScoreSheetJudgeNumber;
  judgeTitle: string;
  match: JudgeScoreSheetMatchDto;
};

export type JudgeScoreSheetDocumentDto = {
  eventId: string;
  eventName: string;
  documentTitle: string;
  footerNote: string;
  judges: JudgeScoreSheetJudgeNumber[];
  venueFilterId: string | null;
  matchCount: number;
  pageCount: number;
  pages: JudgeScoreSheetPageDto[];
  venues: JudgeScoreSheetVenueDto[];
};

export type JudgeScoreSheetMetaDto = {
  eventId: string;
  eventName: string;
  matchCount: number;
  venues: JudgeScoreSheetVenueDto[];
};

export const JUDGE_SCORE_SHEET_FOOTER_NOTE =
  "심판은 점수·이름·서명만 작성합니다. 경기 종료 후 즉시 최종 주심에게 제출";
