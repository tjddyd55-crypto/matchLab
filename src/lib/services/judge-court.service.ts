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
import {
  formatDivisionNameLabel,
  parseBracketFighterSnapshot,
} from "@/lib/bracket-snapshot";
import { AppError } from "@/lib/errors/app-error";
import { computeScorecardTotals } from "@/lib/judge-score-aggregation";
import { hashJudgePassword } from "@/lib/judge-password";
import { readRequestClientMeta } from "@/lib/judge-request-meta";
import { defaultRoundCountForSport } from "@/lib/judge-round-count";
import { parseBirthDateInput, formatBirthDateInput } from "@/lib/judge-identity";
import { outcomeStylePublicLabel } from "@/lib/match-result-snapshot";
import { prisma } from "@/lib/prisma";
import { judgeCredentialRepository } from "@/lib/repositories/judge-credential.repository";
import { judgeScorecardRepository } from "@/lib/repositories/judge-scorecard.repository";
import { resultService } from "@/lib/services/result.service";
import type { ConfirmMatchResultsInput } from "@/lib/validators/result.validator";

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
  roundCount: number;
  winnerId: string | null;
  loserId: string | null;
  winnerName: string | null;
  loserName: string | null;
  resultType: BracketMatchOutcomeStyle | null;
  resultTypeLabel: string | null;
  resultMemo: string | null;
};

export type CourtJudgeScorecardVM = {
  judgeName: string;
  redTotal: number | null;
  blueTotal: number | null;
  winnerCorner: JudgeWinnerCorner;
  decisionMethod: JudgeDecisionMethod | null;
  memo: string | null;
  submittedAt: string | null;
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
};

export type CourtJudgeHeadContext = {
  court: CourtJudgeCourtVM;
  matches: CourtJudgeMatchVM[];
  ongoingMatchId: string | null;
  scorecardsByMatchId: Record<string, CourtJudgeScorecardVM[]>;
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
    include: {
      division: {
        select: {
          sportType: true,
          ruleType: true,
          gender: true,
          ageGroup: true,
          weightClass: true,
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
  return {
    eventId: court.event.id,
    eventTitle: court.event.title,
    courtId: court.id,
    courtName: court.name,
    matchId: match.id,
    matchNumber: match.matchNumber,
    courtOrder: match.courtOrder,
    divisionLabel: match.bracket.division
      ? formatDivisionNameLabel(match.bracket.division)
      : null,
    bracketTitle: match.bracket.title,
    fighterRedId: match.fighterRedId,
    fighterRedName: fighterName(match.fighterRed, match.fighterRedSnapshot),
    fighterRedGymName: fighterGymName(match.fighterRed, match.fighterRedSnapshot),
    fighterBlueId: match.fighterBlueId,
    fighterBlueName: fighterName(match.fighterBlue, match.fighterBlueSnapshot),
    fighterBlueGymName: fighterGymName(match.fighterBlue, match.fighterBlueSnapshot),
    status: match.status,
    roundCount: defaultRoundCountForSport(match.bracket.division?.sportType ?? null),
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

async function mapScorecards(matchIds: string[]): Promise<Record<string, CourtJudgeScorecardVM[]>> {
  if (matchIds.length === 0) return {};
  const grouped = await Promise.all(
    matchIds.map(async (matchId) => {
      const scorecards = await judgeScorecardRepository.listByMatch(matchId);
      return [
        matchId,
        scorecards
          .filter(
            (s) =>
              s.status === JudgeScorecardStatus.submitted ||
              s.status === JudgeScorecardStatus.revised ||
              s.status === JudgeScorecardStatus.locked,
          )
          .map((s) => ({
            judgeName: s.judgeName,
            redTotal: s.redTotal,
            blueTotal: s.blueTotal,
            winnerCorner: s.winnerCorner,
            decisionMethod: s.decisionMethod,
            memo: s.memo,
            submittedAt: s.submittedAt?.toISOString() ?? null,
          })),
      ] as const;
    }),
  );
  return Object.fromEntries(grouped);
}

export const judgeCourtService = {
  async listCourtMatches(courtId: string): Promise<CourtJudgeMatchVM[]> {
    const court = await findCourt(courtId);
    const rows = await listCourtMatchRows(courtId);
    return rows.map((match) => toCourtJudgeMatchVM(court, match));
  },

  async getScoringContext(courtId: string): Promise<CourtJudgeScoringContext> {
    const court = await findCourt(courtId);
    const rows = await listCourtMatchRows(courtId);
    const ongoing = rows.find((m) => m.status === BracketMatchStatus.ongoing);
    return {
      court: toCourtVM(court),
      matches: rows.map((match) => toCourtJudgeMatchVM(court, match)),
      ongoingMatchId: ongoing?.id ?? null,
    };
  },

  async getHeadContext(courtId: string): Promise<CourtJudgeHeadContext> {
    const court = await findCourt(courtId);
    const rows = await listCourtMatchRows(courtId);
    const ongoing = rows.find((m) => m.status === BracketMatchStatus.ongoing);
    const ongoingId = ongoing?.id ?? null;
    const scorecardMatchIds = ongoingId ? [ongoingId] : [];
    return {
      court: toCourtVM(court),
      matches: rows.map((match) => toCourtJudgeMatchVM(court, match)),
      ongoingMatchId: ongoingId,
      scorecardsByMatchId: await mapScorecards(scorecardMatchIds),
    };
  },

  async submitOpenScorecard(input: {
    courtId: string;
    matchId: string;
    judgeName: string;
    birthDate: string;
    redScore: number;
    blueScore: number;
    decisionMethod?: JudgeDecisionMethod | null;
    memo?: string | null;
  }): Promise<void> {
    const court = await findCourt(input.courtId);
    const match = await findOngoingCourtMatch(input.courtId);
    if (!match || match.id !== input.matchId) {
      throw new AppError("CONFLICT", "현재 진행중인 경기가 아닙니다.");
    }
    const birth = parseBirthDateInput(input.birthDate);
    if (!birth) {
      throw new AppError("VALIDATION_ERROR", "생년월일 형식이 올바르지 않습니다.");
    }
    const judgeName = input.judgeName.trim();
    if (!judgeName) {
      throw new AppError("VALIDATION_ERROR", "이름을 입력해 주세요.");
    }

    const birthSnapshot = formatBirthDateInput(birth);
    const loginId = `court-${court.id}-${normalizeKey(judgeName)}-${birthSnapshot.replace(/-/g, "")}`;
    let credential = await judgeCredentialRepository.findByLoginId(loginId);
    if (!credential) {
      credential = await judgeCredentialRepository.create({
        eventId: court.event.id,
        loginId,
        passwordHash: hashJudgePassword(randomUUID()),
        displayName: judgeName,
        role: JudgeCredentialRole.SCORING_JUDGE,
        memo: `경기장 채점 링크 자동 생성: ${court.name}`,
      });
      await judgeCredentialRepository.confirmIdentity(credential.id, {
        verifiedName: judgeName,
        birthDate: birth,
      });
    }

    const rounds = [
      {
        roundNumber: 1,
        redScore: input.redScore,
        blueScore: input.blueScore,
        redKnockdowns: 0,
        blueKnockdowns: 0,
        redDeductions: 0,
        blueDeductions: 0,
        warningMemo: null,
        roundMemo: input.memo?.trim() || null,
      },
    ];
    const totals = computeScorecardTotals(rounds);
    const meta = await readRequestClientMeta();
    await judgeScorecardRepository.upsertDraft({
      eventId: court.event.id,
      matchId: match.id,
      credentialId: credential.id,
      judgeName,
      judgeBirthDateSnapshot: birthSnapshot,
      judgeRoleSnapshot: JudgeCredentialRole.SCORING_JUDGE,
      cornerRedFighterId: match.fighterRedId,
      cornerBlueFighterId: match.fighterBlueId,
      roundCount: 1,
      status: JudgeScorecardStatus.submitted,
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
        status: BracketMatchStatus.waiting,
        bracket: { eventId: court.event.id },
      },
    });
    if (!target) {
      throw new AppError("NOT_FOUND", "시작할 수 있는 대기 경기가 아닙니다.");
    }
    await prisma.bracketMatch.update({
      where: { id: target.id },
      data: { status: BracketMatchStatus.ongoing, startedAt: new Date() },
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
