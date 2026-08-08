import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  AuditAction,
  GymMemberPaymentMethod,
  GymMemberPaymentStatus,
  GymSalesCategory,
} from "@/lib/enums";
import {
  requireGymPortalRead,
  requireGymPortalWrite,
} from "@/lib/gym-portal-access";
import { toUtcDateOnly } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { gymMemberLockerRepository } from "@/lib/repositories/gym-member-locker.repository";
import { gymMemberRepository } from "@/lib/repositories/gym-member.repository";
import {
  lockerRangesOverlap,
  normalizeLockerLabel,
} from "@/lib/gym-member/locker-label";

const LOCKER_TX = { maxWait: 15_000, timeout: 30_000 } as const;

function displayStatus(rental: {
  endedAt: Date | null;
  endsAt: Date | null;
}): "active" | "ended" | "expired" {
  if (rental.endedAt) return "ended";
  if (rental.endsAt && rental.endsAt.getTime() < toUtcDateOnly(new Date()).getTime()) {
    return "expired";
  }
  return "active";
}

async function assertNoLabelOverlap(params: {
  gymId: string;
  lockerLabel: string;
  startedAt: Date;
  endsAt: Date | null;
  excludeRentalId?: string;
  tx?: Parameters<typeof gymMemberLockerRepository.findOpenByLabel>[2];
}) {
  const open = await gymMemberLockerRepository.findOpenByLabel(
    params.gymId,
    params.lockerLabel,
    params.tx,
  );
  const conflict = open.find((row) => {
    if (params.excludeRentalId && row.id === params.excludeRentalId) {
      return false;
    }
    return lockerRangesOverlap(
      { startedAt: row.startedAt, endsAt: row.endsAt },
      { startedAt: params.startedAt, endsAt: params.endsAt },
    );
  });
  if (conflict) {
    throw new AppError(
      "CONFLICT",
      "같은 기간에 이미 사용 중인 사물함 번호입니다.",
      { conflictingRentalId: conflict.id },
    );
  }
}

export const gymMemberLockerService = {
  async listRentals(actor: ActorContext, memberId: string) {
    const access = await requireGymPortalRead(actor);
    const member = await gymMemberRepository.findByIdForGym(
      memberId,
      access.gymId,
    );
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
    const rows = await gymMemberLockerRepository.listForMember(
      access.gymId,
      memberId,
    );
    return rows.map((r) => ({
      ...r,
      displayStatus: displayStatus(r),
    }));
  },

  async getActiveSummary(actor: ActorContext, memberId: string) {
    const access = await requireGymPortalRead(actor);
    const active = await gymMemberLockerRepository.findActiveForMember(
      access.gymId,
      memberId,
    );
    if (!active) return null;
    return { ...active, displayStatus: displayStatus(active) };
  },

  async createRental(
    actor: ActorContext,
    memberId: string,
    input: {
      lockerLabel: string;
      startedAt: Date;
      endsAt?: Date | null;
      amount: number;
      memo?: string | null;
      createPayment?: boolean;
      paymentMethod?: GymMemberPaymentMethod;
    },
  ) {
    const access = await requireGymPortalWrite(actor);
    const member = await gymMemberRepository.findByIdForGym(
      memberId,
      access.gymId,
    );
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
    const label = normalizeLockerLabel(input.lockerLabel);
    if (!label) {
      throw new AppError("VALIDATION_ERROR", "사물함 번호를 입력해 주세요.");
    }
    if (!Number.isFinite(input.amount) || input.amount < 0) {
      throw new AppError("VALIDATION_ERROR", "이용금액이 올바르지 않습니다.");
    }
    const startedAt = toUtcDateOnly(input.startedAt);
    const endsAt = input.endsAt ? toUtcDateOnly(input.endsAt) : null;
    if (endsAt && endsAt.getTime() < startedAt.getTime()) {
      throw new AppError(
        "VALIDATION_ERROR",
        "종료일은 시작일 이후여야 합니다.",
      );
    }
    const existing = await gymMemberLockerRepository.findActiveForMember(
      access.gymId,
      memberId,
    );
    if (existing) {
      throw new AppError(
        "CONFLICT",
        "이미 이용 중인 사물함이 있습니다. 종료 후 새로 등록해 주세요.",
      );
    }
    await assertNoLabelOverlap({
      gymId: access.gymId,
      lockerLabel: label,
      startedAt,
      endsAt,
    });

    return prisma.$transaction(async (tx) => {
      await assertNoLabelOverlap({
        gymId: access.gymId,
        lockerLabel: label,
        startedAt,
        endsAt,
        tx,
      });
      let paymentId: string | undefined;
      if (input.createPayment && input.amount > 0) {
        const payment = await tx.gymMemberPayment.create({
          data: {
            gymId: access.gymId,
            gymMemberId: memberId,
            paidAt: new Date(),
            amount: input.amount,
            paymentMethod: input.paymentMethod ?? GymMemberPaymentMethod.cash,
            status: GymMemberPaymentStatus.paid,
            category: GymSalesCategory.locker,
            memo: `사물함 ${label}`,
            createdByUserId: actor.userId,
          },
        });
        paymentId = payment.id;
      }

      const rental = await gymMemberLockerRepository.createUnchecked(
        {
          gymId: access.gymId,
          gymMemberId: memberId,
          lockerLabel: label,
          startedAt,
          endsAt,
          /** 최초 등록 금액. 연장 추가금은 결제 row에만 누적되며 이 필드는 합산 표시용이 아니다. */
          amount: input.amount,
          memo: input.memo ?? null,
          createdByUserId: actor.userId,
          updatedByUserId: actor.userId,
          paymentId: paymentId ?? null,
        },
        tx,
      );

      await auditRepository.createAuditLog({
        actorUserId: actor.userId,
        action: AuditAction.gym_member_updated,
        targetType: "GymMemberLockerRental",
        targetId: rental.id,
        afterData: { op: "create", lockerLabel: label },
      });

      return rental;
    }, LOCKER_TX);
  },

  async extendRental(
    actor: ActorContext,
    rentalId: string,
    input: {
      newEndsAt: Date;
      additionalAmount: number;
      paymentMethod?: GymMemberPaymentMethod;
      memo?: string | null;
    },
  ) {
    const access = await requireGymPortalWrite(actor);
    const rental = await gymMemberLockerRepository.findByIdForGym(
      rentalId,
      access.gymId,
    );
    if (!rental || rental.endedAt) {
      throw new AppError("NOT_FOUND", "연장할 사물함 이용을 찾을 수 없습니다.");
    }
    const newEnds = toUtcDateOnly(input.newEndsAt);
    if (rental.endsAt && newEnds.getTime() <= rental.endsAt.getTime()) {
      throw new AppError(
        "VALIDATION_ERROR",
        "연장 종료일은 현재 종료일보다 뒤여야 합니다.",
      );
    }
    if (
      !Number.isFinite(input.additionalAmount) ||
      input.additionalAmount < 0
    ) {
      throw new AppError("VALIDATION_ERROR", "추가 금액이 올바르지 않습니다.");
    }
    await assertNoLabelOverlap({
      gymId: access.gymId,
      lockerLabel: rental.lockerLabel,
      startedAt: rental.startedAt,
      endsAt: newEnds,
      excludeRentalId: rentalId,
    });

    return prisma.$transaction(async (tx) => {
      await assertNoLabelOverlap({
        gymId: access.gymId,
        lockerLabel: rental.lockerLabel,
        startedAt: rental.startedAt,
        endsAt: newEnds,
        excludeRentalId: rentalId,
        tx,
      });
      let paymentId = rental.paymentId;
      if (input.additionalAmount > 0) {
        const payment = await tx.gymMemberPayment.create({
          data: {
            gymId: access.gymId,
            gymMemberId: rental.gymMemberId,
            paidAt: new Date(),
            amount: input.additionalAmount,
            paymentMethod: input.paymentMethod ?? GymMemberPaymentMethod.cash,
            status: GymMemberPaymentStatus.paid,
            category: GymSalesCategory.locker,
            memo: `사물함 ${rental.lockerLabel} 연장`,
            createdByUserId: actor.userId,
          },
        });
        paymentId = payment.id;
      }

      const updated = await gymMemberLockerRepository.update(
        rentalId,
        {
          endsAt: newEnds,
          // amount = 최초 등록 금액 유지. 연장 추가금은 GymMemberPayment(locker)로만 기록.
          memo: input.memo ?? rental.memo,
          updatedByUserId: actor.userId,
          ...(paymentId
            ? { payment: { connect: { id: paymentId } } }
            : {}),
        },
        tx,
      );

      await auditRepository.createAuditLog({
        actorUserId: actor.userId,
        action: AuditAction.gym_member_updated,
        targetType: "GymMemberLockerRental",
        targetId: rentalId,
        afterData: { op: "extend", endsAt: newEnds.toISOString() },
      });

      return updated;
    }, LOCKER_TX);
  },

  async endRental(actor: ActorContext, rentalId: string) {
    const access = await requireGymPortalWrite(actor);
    const rental = await gymMemberLockerRepository.findByIdForGym(
      rentalId,
      access.gymId,
    );
    if (!rental || rental.endedAt) {
      throw new AppError("NOT_FOUND", "종료할 사물함 이용을 찾을 수 없습니다.");
    }
    const updated = await gymMemberLockerRepository.update(rentalId, {
      endedAt: toUtcDateOnly(new Date()),
      updatedByUserId: actor.userId,
    });
    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.gym_member_updated,
      targetType: "GymMemberLockerRental",
      targetId: rentalId,
      afterData: { op: "end" },
    });
    return updated;
  },
};
