import "server-only";

import { randomUUID } from "node:crypto";
import {
  BracketMatchStatus,
  JudgeCredentialRole,
  JudgeDecisionMethod,
  JudgeScorecardStatus,
  type JudgeWinnerCorner,
} from "@/generated/prisma";
import { formatDivisionNameLabel } from "@/lib/bracket-snapshot";
import { AppError } from "@/lib/errors/app-error";
import { computeScorecardTotals } from "@/lib/judge-score-aggregation";
import { hashJudgePassword } from "@/lib/judge-password";
import { readRequestClientMeta } from "@/lib/judge-request-meta";
import { defaultRoundCountForSport } from "@/lib/judge-round-count";
import { parseBirthDateInput, formatBirthDateInput } from "@/lib/judge-identity";
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
  matchId: string | null;
  matchNumber: number | null;
  courtOrder: number | null;
  divisionLabel: string | null;
  bracketTitle: string | null;
  fighterRedId: string | null;
  fighterRedName: string;
  fighterBlueId: string | null;
  fighterBlueName: string;
  status: BracketMatchStatus | null;
  roundCount: number;
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

function fighterName(fighter: { name: string } | null, snapshot: unknown): string {
  if (fighter?.name) return fighter.name;
  if (snapshot && typeof snapshot === "object" && snapshot !== null) {
    const n = (snapshot as { name?: string }).name;
    if (n) return n;
  }
  return "미배정";
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9가-힣]+/gi, "-").replace(/^-|-$/g, "");
}

function toCourtJudgeMatchVM(
  court: { id: string; name: string; event: { id: string; title: string } },
  match: Awaited<ReturnType<typeof findCurrentCourtMatch>>,
): CourtJudgeMatchVM {
  if (!match) {
    return {
      eventId: court.event.id,
      eventTitle: court.event.title,
      courtId: court.id,
      courtName: court.name,
      matchId: null,
      matchNumber: null,
      courtOrder: null,
      divisionLabel: null,
      bracketTitle: null,
      fighterRedId: null,
      fighterRedName: "미배정",
      fighterBlueId: null,
      fighterBlueName: "미배정",
      status: null,
      roundCount: 3,
    };
  }

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
    fighterBlueId: match.fighterBlueId,
    fighterBlueName: fighterName(match.fighterBlue, match.fighterBlueSnapshot),
    status: match.status,
    roundCount: defaultRoundCountForSport(match.bracket.division?.sportType ?? null),
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

async function findCurrentCourtMatch(courtId: string) {
  const ongoing = await findOngoingCourtMatch(courtId);
  if (ongoing) return ongoing;
  return prisma.bracketMatch.findFirst({
    where: {
      courtId,
      status: BracketMatchStatus.waiting,
    },
    orderBy: [
      { courtOrder: "asc" },
      { globalMatchOrder: "asc" },
      { matchOrder: "asc" },
    ],
    include: {
      fighterRed: { select: { name: true } },
      fighterBlue: { select: { name: true } },
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
    },
  });
}

async function findOngoingCourtMatch(courtId: string) {
  return prisma.bracketMatch.findFirst({
    where: { courtId, status: BracketMatchStatus.ongoing },
    orderBy: [{ courtOrder: "asc" }, { globalMatchOrder: "asc" }, { matchOrder: "asc" }],
    include: {
      fighterRed: { select: { name: true } },
      fighterBlue: { select: { name: true } },
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
    },
  });
}

export const judgeCourtService = {
  async getScoringContext(courtId: string): Promise<CourtJudgeMatchVM> {
    const court = await findCourt(courtId);
    const match = await findOngoingCourtMatch(courtId);
    return toCourtJudgeMatchVM(court, match);
  },

  async getHeadContext(courtId: string): Promise<{
    match: CourtJudgeMatchVM;
    scorecards: CourtJudgeScorecardVM[];
  }> {
    const court = await findCourt(courtId);
    const match = await findCurrentCourtMatch(courtId);
    const vm = toCourtJudgeMatchVM(court, match);
    const scorecards = match
      ? await judgeScorecardRepository.listByMatch(match.id)
      : [];
    return {
      match: vm,
      scorecards: scorecards
        .filter((s) => s.status === "submitted" || s.status === "revised" || s.status === "locked")
        .map((s) => ({
          judgeName: s.judgeName,
          redTotal: s.redTotal,
          blueTotal: s.blueTotal,
          winnerCorner: s.winnerCorner,
          decisionMethod: s.decisionMethod,
          memo: s.memo,
          submittedAt: s.submittedAt?.toISOString() ?? null,
        })),
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

  async startCurrentOrNext(courtId: string): Promise<void> {
    const court = await findCourt(courtId);
    const ongoing = await findOngoingCourtMatch(courtId);
    if (ongoing) return;
    const next = await findCurrentCourtMatch(courtId);
    if (!next) throw new AppError("NOT_FOUND", "시작할 경기가 없습니다.");
    await prisma.bracketMatch.update({
      where: { id: next.id },
      data: { status: BracketMatchStatus.ongoing, startedAt: new Date() },
    });
    void court;
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
