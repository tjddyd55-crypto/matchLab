import "server-only";

import { randomUUID } from "node:crypto";
import {
  BracketMatchStatus,
  JudgeCredentialRole,
  JudgeDecisionMethod,
  JudgeScorecardStatus,
  type BracketMatchOutcomeStyle,
  type JudgeWinnerCorner,
} from "@/generated/prisma";
import { parseBracketFighterSnapshot } from "@/lib/bracket-snapshot";
import {
  formatDivisionLabel,
} from "@/lib/division-display";
import { AppError } from "@/lib/errors/app-error";
import { computeScorecardTotals } from "@/lib/judge-score-aggregation";
import { hashJudgePassword } from "@/lib/judge-password";
import { readRequestClientMeta } from "@/lib/judge-request-meta";
import { defaultRoundCountForSport } from "@/lib/judge-round-count";
import { parseBirthDateInput, formatBirthDateInput } from "@/lib/judge-identity";
import { effectiveScoringRoundCountFromOps } from "@/lib/court-judge-rounds";
import { resolveMatchIsPublicSparring } from "@/lib/match-bout-settings";
import {
  encodeMatchOperationalSettings,
  parseMatchOperationalSettings,
  type MatchOperationalSettings,
  formatOperationalSettingsLabel,
} from "@/lib/match-operational-settings";
import { outcomeStylePublicLabel } from "@/lib/match-result-snapshot";
import { assertBracketMatchStatusTransition } from "@/lib/match-status-transition";
import { BracketType } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { judgeCredentialRepository } from "@/lib/repositories/judge-credential.repository";
import { judgeScorecardRepository } from "@/lib/repositories/judge-scorecard.repository";
import { resultService } from "@/lib/services/result.service";
import type { ConfirmMatchResultsInput } from "@/lib/validators/result.validator";
import {
  deriveCourtJudgeScene,
  type CourtJudgeScene,
} from "@/lib/court-judge-page-state";

export type CourtJudgePageLoadResult =
  | { kind: "invalid_court" }
  | {
      kind: "inactive_court";
      eventTitle: string | null;
      courtName: string | null;
    }
  | {
      kind: "ok";
      court: CourtJudgeCourtVM;
      matches: CourtJudgeMatchVM[];
      ongoingMatchId: string | null;
      scene: CourtJudgeScene;
      scoreSummariesByMatchId: Record<string, CourtMatchScoreSummaryVM>;
      scorecardsByMatchId: Record<string, CourtJudgeScorecardVM[]>;
    };

export type CourtJudgeMatchVM = {
  eventId: string;
  eventTitle: string;
  courtId: string;
  courtName: string;
  matchId: string;
  matchNumber: number | null;
  courtOrder: number | null;
  divisionLabel: string | null;
  bracketTitle: string | null;
  fighterRedId: string | null;
  fighterRedName: string;
  fighterRedGymName: string | null;
  fighterBlueId: string | null;
  fighterBlueName: string;
  fighterBlueGymName: string | null;
  status: BracketMatchStatus;
  bracketType: BracketType;
  bracketIsPublic: boolean;
  matchIsPublicSparring: boolean;
  roundCount: number;
  roundTimeSec: number;
  overtimeEnabled: boolean;
  overtimeRoundCount: number;
  operationalSettingsLabel: string;
  displayResultMemo: string;
  winnerId: string | null;
  loserId: string | null;
  winnerName: string | null;
  loserName: string | null;
  resultType: BracketMatchOutcomeStyle | null;
  resultTypeLabel: string | null;
  resultMemo: string | null;
};

export type CourtJudgeScorecardRoundVM = {
  roundNumber: number;
  redScore: number | null;
  blueScore: number | null;
};

export type CourtJudgeScorecardVM = {
  scorecardId: string;
  judgeName: string;
  judgeBirthDateSnapshot: string | null;
  redTotal: number | null;
  blueTotal: number | null;
  winnerCorner: JudgeWinnerCorner;
  decisionMethod: JudgeDecisionMethod | null;
  memo: string | null;
  submittedAt: string | null;
  rounds: CourtJudgeScorecardRoundVM[];
};

export type CourtMatchScoreSummaryVM = {
  submittedCount: number;
  label: string;
};

export type CourtJudgeCourtVM = {
  eventId: string;
  eventTitle: string;
  courtId: string;
  courtName: string;
};

export type CourtJudgeScoringContext = {
  court: CourtJudgeCourtVM;
  matches: CourtJudgeMatchVM[];
  ongoingMatchId: string | null;
  scoreSummariesByMatchId: Record<string, CourtMatchScoreSummaryVM>;
};

export type CourtJudgeHeadContext = {
  court: CourtJudgeCourtVM;
  matches: CourtJudgeMatchVM[];
  ongoingMatchId: string | null;
  scorecardsByMatchId: Record<string, CourtJudgeScorecardVM[]>;
  scoreSummariesByMatchId: Record<string, CourtMatchScoreSummaryVM>;
};

export type CourtJudgeMyScorecardVM = {
  scorecardId: string;
  status: JudgeScorecardStatus;
  redTotal: number | null;
  blueTotal: number | null;
  winnerCorner: JudgeWinnerCorner;
  decisionMethod: JudgeDecisionMethod | null;
  memo: string | null;
  submittedAt: string | null;
  rounds: CourtJudgeScorecardRoundVM[];
  isLocked: boolean;
};

const matchInclude = {
  fighterRed: {
    select: {
      name: true,
      currentGym: { select: { name: true } },
    },
  },
  fighterBlue: {
    select: {
      name: true,
      currentGym: { select: { name: true } },
    },
  },
  winner: { select: { name: true } },
  loser: { select: { name: true } },
  bracket: {
    select: {
      title: true,
      type: true,
      isPublic: true,
      division: {
        select: {
          sportType: true,
          ruleType: true,
          gender: true,
          ageGroup: true,
          weightClass: true,
          weightClassName: true,
          weightLimitText: true,
          skillLevel: true,
        },
      },
    },
  },
} as const;

type CourtMatchRow = Awaited<
  ReturnType<
    typeof prisma.bracketMatch.findMany<{ include: typeof matchInclude }>
  >
>[number];

function fighterName(fighter: { name: string } | null, snapshot: unknown): string {
  if (fighter?.name) return fighter.name;
  const parsed = parseBracketFighterSnapshot(snapshot);
  if (parsed?.name) return parsed.name;
  return "미배정";
}

function fighterGymName(
  fighter: { currentGym: { name: string } | null } | null,
  snapshot: unknown,
): string | null {
  if (fighter?.currentGym?.name) return fighter.currentGym.name;
  const parsed = parseBracketFighterSnapshot(snapshot);
  return parsed?.gymName ?? null;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9가-힣]+/gi, "-").replace(/^-|-$/g, "");
}

function toCourtJudgeMatchVM(
  court: { id: string; name: string; event: { id: string; title: string } },
  match: CourtMatchRow,
): CourtJudgeMatchVM {
  const ops = parseMatchOperationalSettings(match.resultMemo);
  const defaultRounds = defaultRoundCountForSport(match.bracket.division?.sportType ?? null);
  const settings: MatchOperationalSettings = {
    ...ops.settings,
    roundCount: ops.settings.roundCount || defaultRounds,
  };

  return {
    eventId: court.event.id,
    eventTitle: court.event.title,
    courtId: court.id,
    courtName: court.name,
    matchId: match.id,
    matchNumber: match.matchNumber,
    courtOrder: match.courtOrder,
    divisionLabel: match.bracket.division
      ? formatDivisionLabel(match.bracket.division)
      : null,
    bracketTitle: match.bracket.title,
    bracketType: match.bracket.type,
    bracketIsPublic: match.bracket.isPublic,
    matchIsPublicSparring: resolveMatchIsPublicSparring({
      bracketType: match.bracket.type,
      bracketIsPublic: match.bracket.isPublic,
      resultMemo: match.resultMemo,
    }),
    fighterRedId: match.fighterRedId,
    fighterRedName: fighterName(match.fighterRed, match.fighterRedSnapshot),
    fighterRedGymName: fighterGymName(match.fighterRed, match.fighterRedSnapshot),
    fighterBlueId: match.fighterBlueId,
    fighterBlueName: fighterName(match.fighterBlue, match.fighterBlueSnapshot),
    fighterBlueGymName: fighterGymName(match.fighterBlue, match.fighterBlueSnapshot),
    status: match.status,
    roundCount: settings.roundCount,
    roundTimeSec: settings.roundTimeSec,
    overtimeEnabled: settings.overtimeEnabled,
    overtimeRoundCount: settings.overtimeRoundCount,
    operationalSettingsLabel: formatOperationalSettingsLabel(settings),
    displayResultMemo: ops.displayMemo,
    winnerId: match.winnerId,
    loserId: match.loserId,
    winnerName: match.winner?.name ?? null,
    loserName: match.loser?.name ?? null,
    resultType: match.resultType,
    resultTypeLabel: outcomeStylePublicLabel(match.resultType),
    resultMemo: match.resultMemo ?? null,
  };
}

function toCourtVM(court: {
  id: string;
  name: string;
  event: { id: string; title: string };
}): CourtJudgeCourtVM {
  return {
    eventId: court.event.id,
    eventTitle: court.event.title,
    courtId: court.id,
    courtName: court.name,
  };
}

async function resolveCourtForPage(courtId: string): Promise<
  | { kind: "invalid" }
  | {
      kind: "inactive";
      court: {
        name: string;
        event: { title: string };
      };
    }
  | {
      kind: "active";
      court: Awaited<ReturnType<typeof prisma.eventCourt.findUnique>> & {
        event: { id: string; title: string };
      };
    }
> {
  const trimmedId = courtId?.trim();
  if (!trimmedId) return { kind: "invalid" };

  const court = await prisma.eventCourt.findUnique({
    where: { id: trimmedId },
    include: { event: { select: { id: true, title: true } } },
  });

  if (!court) return { kind: "invalid" };
  if (!court.isActive) {
    return {
      kind: "inactive",
      court: {
        name: court.name,
        event: { title: court.event.title },
      },
    };
  }
  return { kind: "active", court };
}

async function findCourt(courtId: string) {
  const court = await prisma.eventCourt.findUnique({
    where: { id: courtId },
    include: { event: { select: { id: true, title: true } } },
  });
  if (!court || !court.isActive) {
    throw new AppError("NOT_FOUND", "경기장을 찾을 수 없습니다.");
  }
  return court;
}

async function listCourtMatchRows(courtId: string): Promise<CourtMatchRow[]> {
  return prisma.bracketMatch.findMany({
    where: { courtId },
    orderBy: [
      { courtOrder: "asc" },
      { globalMatchOrder: "asc" },
      { matchOrder: "asc" },
    ],
    include: matchInclude,
  });
}

async function findOngoingCourtMatch(courtId: string) {
  return prisma.bracketMatch.findFirst({
    where: { courtId, status: BracketMatchStatus.ongoing },
    orderBy: [{ courtOrder: "asc" }, { globalMatchOrder: "asc" }, { matchOrder: "asc" }],
    include: matchInclude,
  });
}

async function findPreparingCourtMatch(courtId: string) {
  return prisma.bracketMatch.findFirst({
    where: { courtId, status: BracketMatchStatus.called },
    orderBy: [{ courtOrder: "asc" }, { globalMatchOrder: "asc" }, { matchOrder: "asc" }],
    include: matchInclude,
  });
}

async function assertCourtHasNoActiveMatch(courtId: string) {
  const [ongoing, preparing] = await Promise.all([
    findOngoingCourtMatch(courtId),
    findPreparingCourtMatch(courtId),
  ]);
  if (ongoing) {
    throw new AppError("CONFLICT", "이미 진행중인 경기가 있습니다.");
  }
  if (preparing) {
    throw new AppError("CONFLICT", "이미 경기준비 중인 경기가 있습니다.");
  }
}

function toScorecardVM(s: Awaited<ReturnType<typeof judgeScorecardRepository.listByMatch>>[number]): CourtJudgeScorecardVM {
  return {
    scorecardId: s.id,
    judgeName: s.judgeName,
    judgeBirthDateSnapshot: s.judgeBirthDateSnapshot,
    redTotal: s.redTotal,
    blueTotal: s.blueTotal,
    winnerCorner: s.winnerCorner,
    decisionMethod: s.decisionMethod,
    memo: s.memo,
    submittedAt: s.submittedAt?.toISOString() ?? null,
    rounds: s.rounds.map((r) => ({
      roundNumber: r.roundNumber,
      redScore: r.redScore,
      blueScore: r.blueScore,
    })),
  };
}

function isSubmittedScorecardStatus(status: JudgeScorecardStatus): boolean {
  return (
    status === JudgeScorecardStatus.submitted ||
    status === JudgeScorecardStatus.revised ||
    status === JudgeScorecardStatus.locked
  );
}

function summarizeScorecards(cards: CourtJudgeScorecardVM[]): CourtMatchScoreSummaryVM | null {
  if (cards.length === 0) return null;
  let redVotes = 0;
  let blueVotes = 0;
  for (const card of cards) {
    if (card.winnerCorner === "red") redVotes += 1;
    else if (card.winnerCorner === "blue") blueVotes += 1;
  }
  return {
    submittedCount: cards.length,
    label: `채점 ${cards.length}건 · 홍 ${redVotes} · 청 ${blueVotes}`,
  };
}

async function mapScorecards(matchIds: string[]): Promise<Record<string, CourtJudgeScorecardVM[]>> {
  if (matchIds.length === 0) return {};
  const grouped = await Promise.all(
    matchIds.map(async (matchId) => {
      const scorecards = await judgeScorecardRepository.listByMatch(matchId);
      return [
        matchId,
        scorecards.filter((s) => isSubmittedScorecardStatus(s.status)).map(toScorecardVM),
      ] as const;
    }),
  );
  return Object.fromEntries(grouped);
}

function buildScoreSummaries(
  scorecardsByMatchId: Record<string, CourtJudgeScorecardVM[]>,
): Record<string, CourtMatchScoreSummaryVM> {
  const out: Record<string, CourtMatchScoreSummaryVM> = {};
  for (const [matchId, cards] of Object.entries(scorecardsByMatchId)) {
    const summary = summarizeScorecards(cards);
    if (summary) out[matchId] = summary;
  }
  return out;
}

async function resolveCredentialForOpenJudge(
  court: Awaited<ReturnType<typeof findCourt>>,
  judgeName: string,
  birthDate: string,
) {
  const birth = parseBirthDateInput(birthDate);
  if (!birth) {
    throw new AppError("VALIDATION_ERROR", "생년월일 형식이 올바르지 않습니다.");
  }
  const trimmedName = judgeName.trim();
  if (!trimmedName) {
    throw new AppError("VALIDATION_ERROR", "이름을 입력해 주세요.");
  }
  const birthSnapshot = formatBirthDateInput(birth);
  const loginId = `court-${court.id}-${normalizeKey(trimmedName)}-${birthSnapshot.replace(/-/g, "")}`;
  let credential = await judgeCredentialRepository.findByLoginId(loginId);
  if (!credential) {
    credential = await judgeCredentialRepository.create({
      eventId: court.event.id,
      loginId,
      passwordHash: hashJudgePassword(randomUUID()),
      displayName: trimmedName,
      role: JudgeCredentialRole.SCORING_JUDGE,
      memo: `경기장 채점 링크 자동 생성: ${court.name}`,
    });
    await judgeCredentialRepository.confirmIdentity(credential.id, {
      verifiedName: trimmedName,
      birthDate: birth,
    });
  }
  return { credential, birthSnapshot, judgeName: trimmedName };
}

function safeToCourtJudgeMatchVM(
  court: { id: string; name: string; event: { id: string; title: string } },
  match: CourtMatchRow,
): CourtJudgeMatchVM | null {
  try {
    return toCourtJudgeMatchVM(court, match);
  } catch (error) {
    console.error("Failed to map court judge match", { matchId: match.id, error });
    return null;
  }
}

function mapCourtMatchRows(
  court: { id: string; name: string; event: { id: string; title: string } },
  rows: CourtMatchRow[],
): CourtJudgeMatchVM[] {
  return rows
    .map((match) => safeToCourtJudgeMatchVM(court, match))
    .filter((m): m is CourtJudgeMatchVM => m != null);
}

async function buildPageContext(
  court: { id: string; name: string; event: { id: string; title: string } },
): Promise<{
  court: CourtJudgeCourtVM;
  matches: CourtJudgeMatchVM[];
  ongoingMatchId: string | null;
  scene: CourtJudgeScene;
  scoreSummariesByMatchId: Record<string, CourtMatchScoreSummaryVM>;
  scorecardsByMatchId: Record<string, CourtJudgeScorecardVM[]>;
}> {
  const rows = await listCourtMatchRows(court.id);
  const matches = mapCourtMatchRows(court, rows);
  const ongoing = matches.find((m) => m.status === BracketMatchStatus.ongoing);
  const ongoingMatchId = ongoing?.matchId ?? null;
  const scene = deriveCourtJudgeScene(matches, ongoingMatchId);

  const scorecardMatchIds = matches
    .filter(
      (m) =>
        m.status === BracketMatchStatus.ongoing ||
        m.status === BracketMatchStatus.finished,
    )
    .map((m) => m.matchId);

  let scorecardsByMatchId: Record<string, CourtJudgeScorecardVM[]> = {};
  try {
    scorecardsByMatchId = await mapScorecards(scorecardMatchIds);
  } catch (error) {
    console.error("Failed to load scorecards for court judge page", {
      courtId: court.id,
      error,
    });
  }

  return {
    court: toCourtVM(court),
    matches,
    ongoingMatchId,
    scene,
    scoreSummariesByMatchId: buildScoreSummaries(scorecardsByMatchId),
    scorecardsByMatchId,
  };
}

async function loadCourtJudgePage(courtId: string): Promise<CourtJudgePageLoadResult> {
  const resolved = await resolveCourtForPage(courtId);
  if (resolved.kind === "invalid") {
    return { kind: "invalid_court" };
  }
  if (resolved.kind === "inactive") {
    return {
      kind: "inactive_court",
      eventTitle: resolved.court.event.title,
      courtName: resolved.court.name,
    };
  }

  try {
    const ctx = await buildPageContext(resolved.court);
    return { kind: "ok", ...ctx };
  } catch (error) {
    console.error("Failed to build court judge page context", { courtId, error });
    return {
      kind: "ok",
      court: toCourtVM(resolved.court),
      matches: [],
      ongoingMatchId: null,
      scene: "no_matches",
      scoreSummariesByMatchId: {},
      scorecardsByMatchId: {},
    };
  }
}

export async function loadScoringPage(
  courtId: string,
): Promise<CourtJudgePageLoadResult> {
  return loadCourtJudgePage(courtId);
}

export async function loadHeadPage(
  courtId: string,
): Promise<CourtJudgePageLoadResult> {
  return loadCourtJudgePage(courtId);
}

export const judgeCourtService = {
  loadScoringPage,
  loadHeadPage,

  async listCourtMatches(courtId: string): Promise<CourtJudgeMatchVM[]> {
    const court = await findCourt(courtId);
    const rows = await listCourtMatchRows(courtId);
    return rows.map((match) => toCourtJudgeMatchVM(court, match));
  },

  async getScoringContext(courtId: string): Promise<CourtJudgeScoringContext> {
    const loaded = await loadCourtJudgePage(courtId);
    if (loaded.kind !== "ok") {
      throw new AppError("NOT_FOUND", "경기장을 찾을 수 없거나 사용할 수 없습니다.");
    }
    return {
      court: loaded.court,
      matches: loaded.matches,
      ongoingMatchId: loaded.ongoingMatchId,
      scoreSummariesByMatchId: loaded.scoreSummariesByMatchId,
    };
  },

  async getHeadContext(courtId: string): Promise<CourtJudgeHeadContext> {
    const loaded = await loadCourtJudgePage(courtId);
    if (loaded.kind !== "ok") {
      throw new AppError("NOT_FOUND", "경기장을 찾을 수 없거나 사용할 수 없습니다.");
    }
    return {
      court: loaded.court,
      matches: loaded.matches,
      ongoingMatchId: loaded.ongoingMatchId,
      scorecardsByMatchId: loaded.scorecardsByMatchId,
      scoreSummariesByMatchId: loaded.scoreSummariesByMatchId,
    };
  },

  async getMyScorecard(input: {
    courtId: string;
    matchId: string;
    judgeName: string;
    birthDate: string;
  }): Promise<CourtJudgeMyScorecardVM | null> {
    const court = await findCourt(input.courtId);
    const { credential } = await resolveCredentialForOpenJudge(
      court,
      input.judgeName,
      input.birthDate,
    );
    const card = await judgeScorecardRepository.findByMatchAndCredential(
      input.matchId,
      credential.id,
    );
    if (!card || !isSubmittedScorecardStatus(card.status)) {
      return null;
    }
    return {
      scorecardId: card.id,
      status: card.status,
      redTotal: card.redTotal,
      blueTotal: card.blueTotal,
      winnerCorner: card.winnerCorner,
      decisionMethod: card.decisionMethod,
      memo: card.memo,
      submittedAt: card.submittedAt?.toISOString() ?? null,
      rounds: card.rounds.map((r) => ({
        roundNumber: r.roundNumber,
        redScore: r.redScore,
        blueScore: r.blueScore,
      })),
      isLocked: card.status === JudgeScorecardStatus.locked,
    };
  },

  async submitOpenScorecard(input: {
    courtId: string;
    matchId: string;
    judgeName: string;
    birthDate: string;
    rounds: {
      roundNumber: number;
      redScore: number;
      blueScore: number;
    }[];
    decisionMethod?: JudgeDecisionMethod | null;
    memo?: string | null;
  }): Promise<void> {
    const court = await findCourt(input.courtId);
    const match = await findOngoingCourtMatch(input.courtId);
    if (!match || match.id !== input.matchId) {
      throw new AppError("CONFLICT", "현재 진행중인 경기가 아닙니다.");
    }
    if (input.rounds.length === 0) {
      throw new AppError("VALIDATION_ERROR", "라운드 점수를 입력해 주세요.");
    }

    const { credential, birthSnapshot, judgeName } = await resolveCredentialForOpenJudge(
      court,
      input.judgeName,
      input.birthDate,
    );

    const existing = await judgeScorecardRepository.findByMatchAndCredential(
      match.id,
      credential.id,
    );
    if (existing?.status === JudgeScorecardStatus.locked) {
      throw new AppError("CONFLICT", "종료된 경기 채점은 수정할 수 없습니다.");
    }

    const ops = parseMatchOperationalSettings(match.resultMemo);
    const expectedRounds = effectiveScoringRoundCountFromOps({
      ...ops.settings,
      roundCount: ops.settings.roundCount || defaultRoundCountForSport(match.bracket.division?.sportType ?? null),
    });
    if (input.rounds.length !== expectedRounds) {
      throw new AppError(
        "VALIDATION_ERROR",
        `라운드 수가 일치하지 않습니다. (${expectedRounds}라운드)`,
      );
    }

    const rounds = input.rounds.map((r) => ({
      roundNumber: r.roundNumber,
      redScore: r.redScore,
      blueScore: r.blueScore,
      redKnockdowns: 0,
      blueKnockdowns: 0,
      redDeductions: 0,
      blueDeductions: 0,
      warningMemo: null,
      roundMemo: null,
    }));
    const totals = computeScorecardTotals(rounds);
    const meta = await readRequestClientMeta();

    const nextStatus =
      existing?.status === JudgeScorecardStatus.submitted ||
      existing?.status === JudgeScorecardStatus.revised
        ? JudgeScorecardStatus.revised
        : JudgeScorecardStatus.submitted;

    await judgeScorecardRepository.upsertDraft({
      eventId: court.event.id,
      matchId: match.id,
      credentialId: credential.id,
      judgeName,
      judgeBirthDateSnapshot: birthSnapshot,
      judgeRoleSnapshot: JudgeCredentialRole.SCORING_JUDGE,
      cornerRedFighterId: match.fighterRedId,
      cornerBlueFighterId: match.fighterBlueId,
      roundCount: rounds.length,
      status: nextStatus,
      redTotal: totals.redTotal,
      blueTotal: totals.blueTotal,
      winnerCorner: totals.winnerCorner,
      decisionMethod: input.decisionMethod ?? null,
      memo: input.memo?.trim() || null,
      submittedAt: new Date(),
      submittedIp: meta.ip,
      submittedUserAgent: meta.userAgent,
      rounds,
    });
  },

  async prepareMatch(courtId: string, matchId: string): Promise<void> {
    const court = await findCourt(courtId);
    await assertCourtHasNoActiveMatch(courtId);
    const target = await prisma.bracketMatch.findFirst({
      where: {
        id: matchId,
        courtId: court.id,
        status: BracketMatchStatus.waiting,
        bracket: { eventId: court.event.id },
      },
    });
    if (!target) {
      throw new AppError("NOT_FOUND", "경기준비할 수 있는 대기 경기가 아닙니다.");
    }
    assertBracketMatchStatusTransition(target.status, BracketMatchStatus.called);
    await prisma.bracketMatch.update({
      where: { id: target.id },
      data: { status: BracketMatchStatus.called },
    });
  },

  async startMatch(courtId: string, matchId: string): Promise<void> {
    const court = await findCourt(courtId);
    const ongoing = await findOngoingCourtMatch(courtId);
    if (ongoing) {
      throw new AppError("CONFLICT", "이미 진행중인 경기가 있습니다.");
    }
    const target = await prisma.bracketMatch.findFirst({
      where: {
        id: matchId,
        courtId: court.id,
        status: BracketMatchStatus.called,
        bracket: { eventId: court.event.id },
      },
    });
    if (!target) {
      throw new AppError("NOT_FOUND", "시작할 수 있는 경기준비 경기가 아닙니다.");
    }
    assertBracketMatchStatusTransition(target.status, BracketMatchStatus.ongoing);
    await prisma.bracketMatch.update({
      where: { id: target.id },
      data: { status: BracketMatchStatus.ongoing, startedAt: new Date() },
    });
  },

  async updateOperationalSettings(
    courtId: string,
    matchId: string,
    settings: MatchOperationalSettings,
  ): Promise<void> {
    const court = await findCourt(courtId);
    const match = await prisma.bracketMatch.findFirst({
      where: {
        id: matchId,
        courtId: court.id,
        bracket: { eventId: court.event.id },
      },
      select: { id: true, resultMemo: true, status: true },
    });
    if (!match) {
      throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
    }
    if (
      match.status !== BracketMatchStatus.called &&
      match.status !== BracketMatchStatus.ongoing
    ) {
      throw new AppError("CONFLICT", "경기준비/진행중 경기만 라운드 설정을 변경할 수 있습니다.");
    }
    const { displayMemo } = parseMatchOperationalSettings(match.resultMemo);
    await prisma.bracketMatch.update({
      where: { id: match.id },
      data: {
        resultMemo: encodeMatchOperationalSettings(settings, displayMemo),
      },
    });
  },

  async addOvertimeRound(courtId: string, matchId: string): Promise<void> {
    const court = await findCourt(courtId);
    const match = await prisma.bracketMatch.findFirst({
      where: {
        id: matchId,
        courtId: court.id,
        bracket: { eventId: court.event.id },
      },
      select: { id: true, resultMemo: true, status: true },
    });
    if (!match) {
      throw new AppError("NOT_FOUND", "경기를 찾을 수 없습니다.");
    }
    if (match.status !== BracketMatchStatus.ongoing) {
      throw new AppError("CONFLICT", "진행중 경기만 연장 라운드를 추가할 수 있습니다.");
    }
    const { settings, displayMemo } = parseMatchOperationalSettings(match.resultMemo);
    const next: MatchOperationalSettings = {
      ...settings,
      overtimeEnabled: true,
      overtimeRoundCount: Math.min(3, (settings.overtimeRoundCount || 0) + 1),
    };
    await prisma.bracketMatch.update({
      where: { id: match.id },
      data: {
        resultMemo: encodeMatchOperationalSettings(next, displayMemo),
      },
    });
  },

  async cancelMatch(courtId: string, matchId: string, reason?: string | null): Promise<void> {
    const court = await findCourt(courtId);
    await prisma.bracketMatch.updateMany({
      where: { id: matchId, courtId: court.id, bracket: { eventId: court.event.id } },
      data: {
        status: BracketMatchStatus.cancelled,
        endedAt: new Date(),
        resultMemo: reason?.trim() || null,
      },
    });
  },

  async completeMatch(
    courtId: string,
    input: ConfirmMatchResultsInput,
  ): Promise<void> {
    const court = await findCourt(courtId);
    await resultService.confirmMatchResults(
      { kind: "court_head", eventId: court.event.id, courtId: court.id, label: court.name },
      input,
    );
  },
};
