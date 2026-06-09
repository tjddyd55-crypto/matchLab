/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export type JudgeAssignmentRow = {
  id: string;
  eventId: string;
  matchId: string;
  judgeId: string | null;
  credentialId: string | null;
  judgeOrder: number;
  isHeadJudge: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  credential: {
    id: string;
    loginId: string;
    displayName: string | null;
  } | null;
};

export const judgeAssignmentRepository = {
  async listByEvent(eventId: string): Promise<JudgeAssignmentRow[]> {
    return db().judgeMatchAssignment.findMany({
      where: { eventId, isActive: true },
      include: {
        credential: {
          select: { id: true, loginId: true, displayName: true },
        },
      },
      orderBy: [{ matchId: "asc" }, { judgeOrder: "asc" }],
    }) as Promise<JudgeAssignmentRow[]>;
  },

  async listByMatch(matchId: string): Promise<JudgeAssignmentRow[]> {
    return db().judgeMatchAssignment.findMany({
      where: { matchId, isActive: true },
      include: {
        credential: {
          select: { id: true, loginId: true, displayName: true },
        },
      },
      orderBy: { judgeOrder: "asc" },
    }) as Promise<JudgeAssignmentRow[]>;
  },

  async listByCredential(credentialId: string): Promise<JudgeAssignmentRow[]> {
    return db().judgeMatchAssignment.findMany({
      where: { credentialId, isActive: true },
      include: {
        credential: {
          select: { id: true, loginId: true, displayName: true },
        },
      },
      orderBy: { judgeOrder: "asc" },
    }) as Promise<JudgeAssignmentRow[]>;
  },

  async findById(id: string): Promise<JudgeAssignmentRow | null> {
    return db().judgeMatchAssignment.findUnique({
      where: { id },
      include: {
        credential: {
          select: { id: true, loginId: true, displayName: true },
        },
      },
    }) as Promise<JudgeAssignmentRow | null>;
  },

  async create(
    data: {
      eventId: string;
      matchId: string;
      credentialId: string;
      judgeOrder: number;
      isHeadJudge?: boolean;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<JudgeAssignmentRow> {
    return db(tx).judgeMatchAssignment.create({
      data: {
        eventId: data.eventId,
        matchId: data.matchId,
        credentialId: data.credentialId,
        judgeOrder: data.judgeOrder,
        isHeadJudge: data.isHeadJudge ?? false,
      },
      include: {
        credential: {
          select: { id: true, loginId: true, displayName: true },
        },
      },
    }) as Promise<JudgeAssignmentRow>;
  },

  async deactivate(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await db(tx).judgeMatchAssignment.update({
      where: { id },
      data: { isActive: false },
    });
  },

  async countActiveByMatch(matchId: string): Promise<number> {
    return db().judgeMatchAssignment.count({
      where: { matchId, isActive: true },
    });
  },
};
