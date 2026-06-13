import type {
  JudgeCredentialRole,
  JudgeScorecardRevisionAction,
  JudgeScorecardStatus,
  JudgeWinnerCorner,
  Prisma,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export const judgeScorecardChangeLogRepository = {
  async create(
    data: {
      scorecardId: string;
      eventId: string;
      matchId: string;
      credentialId: string;
      judgeNameSnapshot: string;
      judgeBirthDateSnapshot?: string | null;
      judgeRoleSnapshot: JudgeCredentialRole;
      action: JudgeScorecardRevisionAction;
      previousStatus?: JudgeScorecardStatus | null;
      newStatus: JudgeScorecardStatus;
      previousRedTotal?: number | null;
      previousBlueTotal?: number | null;
      newRedTotal?: number | null;
      newBlueTotal?: number | null;
      previousWinnerCorner?: JudgeWinnerCorner | null;
      newWinnerCorner?: JudgeWinnerCorner | null;
      roundsSnapshotJson?: Prisma.InputJsonValue;
      changedByCredentialId: string;
      changedIp?: string | null;
      changedUserAgent?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).judgeScorecardChangeLog.create({ data });
  },
};
