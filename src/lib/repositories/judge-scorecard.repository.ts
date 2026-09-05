/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type {
  JudgeDecisionMethod,
  JudgeScorecardStatus,
  JudgeWinnerCorner,
  Prisma,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export type JudgeRoundScoreRow = {
  id: string;
  scorecardId: string;
  roundNumber: number;
  redScore: number | null;
  blueScore: number | null;
  redKnockdowns: number;
  blueKnockdowns: number;
  redDeductions: number;
  blueDeductions: number;
  warningMemo: string | null;
  roundMemo: string | null;
};

export type JudgeScorecardRow = {
  id: string;
  eventId: string;
  matchId: string;
  credentialId: string;
  judgeName: string;
  judgeBirthDateSnapshot: string | null;
  judgeRoleSnapshot: import("@/generated/prisma").JudgeCredentialRole | null;
  cornerRedFighterId: string | null;
  cornerBlueFighterId: string | null;
  roundCount: number;
  status: JudgeScorecardStatus;
  redTotal: number | null;
  blueTotal: number | null;
  winnerCorner: JudgeWinnerCorner;
  decisionMethod: JudgeDecisionMethod | null;
  memo: string | null;
  submittedAt: Date | null;
  submittedIp: string | null;
  submittedUserAgent: string | null;
  rounds: JudgeRoundScoreRow[];
  updatedAt: Date;
};

export const judgeScorecardRepository = {
  async findByMatchAndCredential(
    matchId: string,
    credentialId: string,
  ): Promise<JudgeScorecardRow | null> {
    return db().judgeScorecard.findUnique({
      where: { matchId_credentialId: { matchId, credentialId } },
      include: { rounds: { orderBy: { roundNumber: "asc" } } },
    });
  },

  async listByMatch(matchId: string): Promise<JudgeScorecardRow[]> {
    return db().judgeScorecard.findMany({
      where: { matchId },
      include: { rounds: { orderBy: { roundNumber: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
  },

  async listByEvent(eventId: string): Promise<JudgeScorecardRow[]> {
    return db().judgeScorecard.findMany({
      where: { eventId },
      include: { rounds: { orderBy: { roundNumber: "asc" } } },
    });
  },

  async upsertDraft(
    data: {
      eventId: string;
      matchId: string;
      credentialId: string;
      judgeName: string;
      judgeBirthDateSnapshot?: string | null;
      judgeRoleSnapshot?: import("@/generated/prisma").JudgeCredentialRole | null;
      cornerRedFighterId: string | null;
      cornerBlueFighterId: string | null;
      roundCount: number;
      status: JudgeScorecardStatus;
      redTotal: number | null;
      blueTotal: number | null;
      winnerCorner: JudgeWinnerCorner;
      decisionMethod: JudgeDecisionMethod | null;
      memo: string | null;
      submittedAt: Date | null;
      submittedIp?: string | null;
      submittedUserAgent?: string | null;
      rounds: {
        roundNumber: number;
        redScore: number | null;
        blueScore: number | null;
        redKnockdowns: number;
        blueKnockdowns: number;
        redDeductions: number;
        blueDeductions: number;
        warningMemo: string | null;
        roundMemo: string | null;
      }[];
    },
    tx?: Prisma.TransactionClient,
  ): Promise<JudgeScorecardRow> {
    const client = db(tx);

    const card = await client.judgeScorecard.upsert({
      where: {
        matchId_credentialId: {
          matchId: data.matchId,
          credentialId: data.credentialId,
        },
      },
      create: {
        eventId: data.eventId,
        matchId: data.matchId,
        credentialId: data.credentialId,
        judgeName: data.judgeName,
        judgeBirthDateSnapshot: data.judgeBirthDateSnapshot ?? null,
        judgeRoleSnapshot: data.judgeRoleSnapshot ?? null,
        cornerRedFighterId: data.cornerRedFighterId,
        cornerBlueFighterId: data.cornerBlueFighterId,
        roundCount: data.roundCount,
        status: data.status,
        redTotal: data.redTotal,
        blueTotal: data.blueTotal,
        winnerCorner: data.winnerCorner,
        decisionMethod: data.decisionMethod,
        memo: data.memo,
        submittedAt: data.submittedAt,
        submittedIp: data.submittedIp ?? null,
        submittedUserAgent: data.submittedUserAgent ?? null,
      },
      update: {
        judgeName: data.judgeName,
        judgeBirthDateSnapshot: data.judgeBirthDateSnapshot ?? null,
        judgeRoleSnapshot: data.judgeRoleSnapshot ?? null,
        cornerRedFighterId: data.cornerRedFighterId,
        cornerBlueFighterId: data.cornerBlueFighterId,
        roundCount: data.roundCount,
        status: data.status,
        redTotal: data.redTotal,
        blueTotal: data.blueTotal,
        winnerCorner: data.winnerCorner,
        decisionMethod: data.decisionMethod,
        memo: data.memo,
        submittedAt: data.submittedAt,
        submittedIp: data.submittedIp ?? null,
        submittedUserAgent: data.submittedUserAgent ?? null,
      },
    });

    await client.judgeRoundScore.deleteMany({
      where: { scorecardId: card.id },
    });

    if (data.rounds.length > 0) {
      await client.judgeRoundScore.createMany({
        data: data.rounds.map((r) => ({
          scorecardId: card.id,
          roundNumber: r.roundNumber,
          redScore: r.redScore,
          blueScore: r.blueScore,
          redKnockdowns: r.redKnockdowns,
          blueKnockdowns: r.blueKnockdowns,
          redDeductions: r.redDeductions,
          blueDeductions: r.blueDeductions,
          warningMemo: r.warningMemo,
          roundMemo: r.roundMemo,
        })),
      });
    }

    const full = await client.judgeScorecard.findUnique({
      where: { id: card.id },
      include: { rounds: { orderBy: { roundNumber: "asc" } } },
    });
    return full!;
  },

  async lockByMatch(matchId: string, tx?: Prisma.TransactionClient): Promise<void> {
    await db(tx).judgeScorecard.updateMany({
      where: { matchId, status: { not: "locked" } },
      data: { status: "locked" },
    });
  },

  async deleteByMatchAndCredential(
    matchId: string,
    credentialId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).judgeScorecard.deleteMany({
      where: { matchId, credentialId },
    });
  },

  async countSubmittedByMatch(matchId: string): Promise<number> {
    return db().judgeScorecard.count({
      where: { matchId, status: { in: ["submitted", "locked"] } },
    });
  },
};
