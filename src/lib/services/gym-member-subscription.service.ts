import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  AuditAction,
  GymMemberStatus,
  GymMemberSubscriptionStatus,
} from "@/lib/enums";
import { toUtcDateOnly } from "@/lib/date-only";
import { requireGymPortalWrite } from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { gymMemberRepository } from "@/lib/repositories/gym-member.repository";
import { addMembershipDuration } from "@/lib/gym-member/membership-duration";

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export const gymMemberSubscriptionService = {
  async assignPlan(
    actor: ActorContext,
    memberId: string,
    input: {
      planId: string;
      startedAt?: Date;
      endsAt?: Date;
      memo?: string;
    },
  ) {
    const access = await requireGymPortalWrite(actor);
    const member = await gymMemberRepository.findByIdForGym(
      memberId,
      access.gymId,
    );
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");

    const plan = await prisma.gymMembershipPlan.findFirst({
      where: {
        id: input.planId,
        gymId: access.gymId,
        deletedAt: null,
        isActive: true,
      },
    });
    if (!plan) throw new AppError("NOT_FOUND", "이용권을 찾을 수 없습니다.");

    const startedAt = input.startedAt
      ? toUtcDateOnly(input.startedAt)
      : toUtcDateOnly(new Date());

    let endsAt: Date | null = input.endsAt
      ? toUtcDateOnly(input.endsAt)
      : null;
    if (!endsAt) {
      endsAt = addMembershipDuration(
        startedAt,
        plan.durationType,
        plan.durationValue,
      );
    }

    const sub = await prisma.$transaction(async (tx) => {
      await tx.gymMemberSubscription.updateMany({
        where: {
          gymMemberId: memberId,
          status: {
            in: [
              GymMemberSubscriptionStatus.active,
              GymMemberSubscriptionStatus.paused,
            ],
          },
        },
        data: {
          status: GymMemberSubscriptionStatus.ended,
          cancelledAt: new Date(),
        },
      });

      const created = await tx.gymMemberSubscription.create({
        data: {
          gymId: access.gymId,
          gymMemberId: memberId,
          planId: plan.id,
          planNameSnapshot: plan.name,
          priceSnapshot: plan.price,
          startedAt,
          endsAt,
          status: GymMemberSubscriptionStatus.active,
          memo: input.memo ?? null,
          createdByUserId: actor.userId,
        },
      });

      if (member.status === GymMemberStatus.withdrawn) {
        await tx.gymMember.update({
          where: { id: memberId },
          data: { status: GymMemberStatus.active },
        });
      }

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_member_subscription_changed,
          targetType: "GymMemberSubscription",
          targetId: created.id,
          afterData: {
            op: "assign",
            memberId,
            planName: plan.name,
          },
        },
        tx,
      );

      return created;
    });

    return sub;
  },

  async extend(
    actor: ActorContext,
    memberId: string,
    subscriptionId: string,
    extendDays: number,
  ) {
    const access = await requireGymPortalWrite(actor);
    const member = await gymMemberRepository.findByIdForGym(
      memberId,
      access.gymId,
    );
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");

    const sub = member.subscriptions.find((s) => s.id === subscriptionId);
    if (!sub) throw new AppError("NOT_FOUND", "이용권을 찾을 수 없습니다.");

    const base = sub.endsAt ? toUtcDateOnly(sub.endsAt) : toUtcDateOnly(new Date());
    const endsAt = addDays(base, extendDays);

    await prisma.$transaction(async (tx) => {
      await tx.gymMemberSubscription.update({
        where: { id: subscriptionId },
        data: { endsAt },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_member_subscription_changed,
          targetType: "GymMemberSubscription",
          targetId: subscriptionId,
          afterData: { op: "extend", extendDays, endsAt: endsAt.toISOString() },
        },
        tx,
      );
    });
  },

  async pause(
    actor: ActorContext,
    memberId: string,
    input: {
      pausedAt?: Date;
      resumeAt?: Date;
      extendEndsAt?: boolean;
      reason?: string;
    },
  ) {
    const access = await requireGymPortalWrite(actor);
    const member = await gymMemberRepository.findByIdForGym(
      memberId,
      access.gymId,
    );
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");

    const sub = member.subscriptions.find(
      (s) => s.status === GymMemberSubscriptionStatus.active,
    );
    if (!sub) {
      throw new AppError("VALIDATION_ERROR", "활성 이용권이 없습니다.");
    }

    const pausedAt = input.pausedAt
      ? toUtcDateOnly(input.pausedAt)
      : toUtcDateOnly(new Date());
    const resumeAt = input.resumeAt ? toUtcDateOnly(input.resumeAt) : null;
    const extendEndsAt = input.extendEndsAt !== false;

    await prisma.$transaction(async (tx) => {
      await tx.gymMember.update({
        where: { id: memberId },
        data: { status: GymMemberStatus.paused },
      });
      await tx.gymMemberSubscription.update({
        where: { id: sub.id },
        data: {
          status: GymMemberSubscriptionStatus.paused,
          pausedAt,
        },
      });
      await tx.gymMemberSubscriptionPause.create({
        data: {
          subscriptionId: sub.id,
          pausedAt,
          resumeAt,
          extendEndsAt,
          reason: input.reason ?? null,
          createdByUserId: actor.userId,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_member_paused,
          targetType: "GymMember",
          targetId: memberId,
          afterData: { extendEndsAt, reason: input.reason ?? null },
        },
        tx,
      );
    });
  },

  async resume(actor: ActorContext, memberId: string) {
    const access = await requireGymPortalWrite(actor);
    const member = await gymMemberRepository.findByIdForGym(
      memberId,
      access.gymId,
    );
    if (!member) throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");

    const sub = member.subscriptions.find(
      (s) => s.status === GymMemberSubscriptionStatus.paused,
    );
    if (!sub) {
      throw new AppError("VALIDATION_ERROR", "휴회 중인 이용권이 없습니다.");
    }

    const resumedAt = toUtcDateOnly(new Date());
    const openPause = sub.pauses.find((p) => !p.resumedAt);

    await prisma.$transaction(async (tx) => {
      let endsAt = sub.endsAt;
      if (openPause?.extendEndsAt && sub.pausedAt && endsAt) {
        const pauseDays = Math.max(
          0,
          Math.round(
            (resumedAt.getTime() - toUtcDateOnly(sub.pausedAt).getTime()) /
              86_400_000,
          ),
        );
        endsAt = addDays(toUtcDateOnly(endsAt), pauseDays);
      }

      await tx.gymMember.update({
        where: { id: memberId },
        data: { status: GymMemberStatus.active },
      });
      await tx.gymMemberSubscription.update({
        where: { id: sub.id },
        data: {
          status: GymMemberSubscriptionStatus.active,
          resumedAt,
          endsAt,
        },
      });
      if (openPause) {
        await tx.gymMemberSubscriptionPause.update({
          where: { id: openPause.id },
          data: { resumedAt },
        });
      }
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_member_resumed,
          targetType: "GymMember",
          targetId: memberId,
          afterData: {
            endsAt: endsAt?.toISOString() ?? null,
          },
        },
        tx,
      );
    });
  },
};
