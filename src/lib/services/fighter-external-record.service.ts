import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AuditAction } from "@/generated/prisma";
import { AppError } from "@/lib/errors/app-error";
import { buildExternalRecordFromFighter } from "@/lib/fighter-unified-profile/record-utils";
import { requireGymPortalWrite } from "@/lib/gym-portal-access";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { fighterRepository } from "@/lib/repositories/fighter.repository";
import { fighterService } from "@/lib/services/fighter.service";
import type { FighterExternalRecordUpdateInput } from "@/lib/validators/fighter-external-record.validator";
import { prisma } from "@/lib/prisma";

function externalRecordSnapshot(f: {
  externalRecordWin: number;
  externalRecordLoss: number;
  externalRecordDraw: number;
  externalRecordNoContest: number;
}) {
  const record = buildExternalRecordFromFighter(f);
  return {
    wins: record.wins,
    losses: record.losses,
    draws: record.draws,
    noContests: record.noContests,
  };
}

export const fighterExternalRecordService = {
  async updateFighterExternalRecord(
    actor: ActorContext,
    input: FighterExternalRecordUpdateInput,
  ): Promise<void> {
    await requireGymPortalWrite(actor);
    await fighterService.assertGymCanManageFighter(actor, input.fighterId);

    const before = await prisma.fighter.findUnique({
      where: { id: input.fighterId },
      select: {
        externalRecordWin: true,
        externalRecordLoss: true,
        externalRecordDraw: true,
        externalRecordNoContest: true,
      },
    });
    if (!before) {
      throw new AppError("NOT_FOUND", "선수를 찾을 수 없습니다.");
    }

    const after = {
      externalRecordWin: input.wins,
      externalRecordLoss: input.losses,
      externalRecordDraw: input.draws,
      externalRecordNoContest: input.noContests,
    };

    await prisma.$transaction(async (tx) => {
      await fighterRepository.updateExternalRecord(tx, input.fighterId, after);
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.fighter_external_record_updated,
          targetType: "Fighter",
          targetId: input.fighterId,
          beforeData: externalRecordSnapshot(before),
          afterData: externalRecordSnapshot(after),
        },
        tx,
      );
    });
  },
};
