import "server-only";

import {
  AuditAction,
  GymMemberPaymentMethod,
  GymMemberPaymentStatus,
  GymMemberStatus,
  GymMemberSubscriptionStatus,
  GymMembershipDurationType,
} from "@/lib/enums";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { toUtcDateOnly, todayUtcDateOnlyString } from "@/lib/date-only";
import { normalizePhoneDigits } from "@/lib/phone";
import { normalizeGymFighterPhone } from "@/lib/gym-fighter-management";
import {
  requireGymPortalRead,
  requireGymPortalWrite,
} from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { gymMemberRepository } from "@/lib/repositories/gym-member.repository";
import { fighterRepository } from "@/lib/repositories/fighter.repository";
import { fighterService } from "@/lib/services/fighter.service";
import { isPrismaUniqueViolation } from "@/lib/prisma-errors";
import {
  computeGymMemberMembershipStatus,
  daysUntilEndsAt,
  getGymMemberExpirationDisplay,
  getGymMemberMembershipStatusLabel,
  todayUtcDateOnly,
  type GymMemberMembershipDisplayStatus,
} from "@/lib/gym-member-membership-status";
import type {
  GymMemberCreateInput,
  GymMemberUpdateInput,
} from "@/lib/validators/gym-member.validator";

export type { GymMemberCreateInput, GymMemberUpdateInput };

function addDuration(
  start: Date,
  durationType: GymMembershipDurationType,
  durationValue: number | null | undefined,
): Date | null {
  if (durationType === GymMembershipDurationType.fixed_end) return null;
  if (!durationValue || durationValue <= 0) return null;
  const d = new Date(start.getTime());
  if (durationType === GymMembershipDurationType.days) {
    d.setUTCDate(d.getUTCDate() + durationValue);
    return d;
  }
  // months
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + durationValue;
  const day = d.getUTCDate();
  return new Date(Date.UTC(y + Math.floor(m / 12), m % 12, day));
}

async function assertMemberOwned(
  actor: ActorContext,
  memberId: string,
  write: boolean,
) {
  const access = write
    ? await requireGymPortalWrite(actor)
    : await requireGymPortalRead(actor);
  const member = await gymMemberRepository.findByIdForGym(
    memberId,
    access.gymId,
  );
  if (!member) {
    throw new AppError("NOT_FOUND", "회원을 찾을 수 없습니다.");
  }
  return { access, member };
}

function syncFighterBasicFromMember(member: {
  name: string;
  birthDate: Date | null;
  gender: string | null;
  phone: string;
  guardianName: string | null;
  guardianPhone: string | null;
  primarySport: string | null;
}): {
  name: string;
  phone: string;
  birthDate?: Date;
  gender?: string;
  guardianName: string | null;
  guardianPhone: string | null;
  primarySport?: string | null;
} {
  return {
    name: member.name,
    phone: member.phone,
    ...(member.birthDate ? { birthDate: member.birthDate } : {}),
    ...(member.gender ? { gender: member.gender } : {}),
    guardianName: member.guardianName,
    guardianPhone: member.guardianPhone,
    ...(member.primarySport ? { primarySport: member.primarySport } : {}),
  };
}

export type GymMemberListItemVM = {
  id: string;
  memberNumber: string;
  name: string;
  phone: string;
  status: GymMemberStatus;
  membershipStatus: GymMemberMembershipDisplayStatus;
  membershipStatusLabel: string;
  planName: string | null;
  startedAt: Date | null;
  endsAt: Date | null;
  expirationDisplay: string;
  isFighter: boolean;
  fighterId: string | null;
  rowNumber: number;
};

export const gymMemberService = {
  async getSummary(actor: ActorContext) {
    const access = await requireGymPortalRead(actor);
    return gymMemberRepository.countSummary(access.gymId);
  },

  async listPromotableMembers(actor: ActorContext, q?: string) {
    const access = await requireGymPortalRead(actor);
    return gymMemberRepository.listSelectableForFighterPromote(access.gymId, q);
  },

  async listMembers(
    actor: ActorContext,
    filters: {
      q?: string;
      status?: GymMemberStatus;
      fighterFilter?: "all" | "fighter" | "non_fighter";
      expirationFilter?: "all" | "active" | "expiring" | "expired" | "no_plan";
      planId?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<{
    items: GymMemberListItemVM[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const access = await requireGymPortalRead(actor);
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 30));
    const skip = (page - 1) * pageSize;

    const { rows, total } = await gymMemberRepository.list({
      gymId: access.gymId,
      q: filters.q,
      status: filters.status,
      fighterFilter: filters.fighterFilter,
      planId: filters.planId,
      skip,
      take: pageSize,
    });

    const today = todayUtcDateOnly();
    let items: GymMemberListItemVM[] = rows.map((row, idx) => {
      const sub = row.subscriptions[0] ?? null;
      const membershipStatus = computeGymMemberMembershipStatus({
        memberStatus: row.status,
        endsAt: sub?.endsAt ?? null,
        todayUtc: today,
      });
      return {
        id: row.id,
        memberNumber: row.memberNumber,
        name: row.name,
        phone: row.phone,
        status: row.status,
        membershipStatus,
        membershipStatusLabel:
          getGymMemberMembershipStatusLabel(membershipStatus),
        planName: sub?.planNameSnapshot ?? null,
        startedAt: sub?.startedAt ?? null,
        endsAt: sub?.endsAt ?? null,
        expirationDisplay: getGymMemberExpirationDisplay(sub?.endsAt, today),
        isFighter: Boolean(row.fighter),
        fighterId: row.fighter?.id ?? null,
        rowNumber: skip + idx + 1,
      };
    });

    if (filters.expirationFilter && filters.expirationFilter !== "all") {
      items = items.filter(
        (i) => i.membershipStatus === filters.expirationFilter,
      );
    }

    return { items, total, page, pageSize };
  },

  async getMemberDetail(actor: ActorContext, memberId: string) {
    const { member } = await assertMemberOwned(actor, memberId, false);
    const today = todayUtcDateOnly();
    const currentSub =
      member.subscriptions.find(
        (s) =>
          s.status === GymMemberSubscriptionStatus.active ||
          s.status === GymMemberSubscriptionStatus.paused,
      ) ?? member.subscriptions[0] ?? null;
    const membershipStatus = computeGymMemberMembershipStatus({
      memberStatus: member.status,
      endsAt: currentSub?.endsAt ?? null,
      todayUtc: today,
    });
    return {
      member,
      currentSubscription: currentSub,
      membershipStatus,
      membershipStatusLabel:
        getGymMemberMembershipStatusLabel(membershipStatus),
      expirationDisplay: getGymMemberExpirationDisplay(
        currentSub?.endsAt,
        today,
      ),
      daysRemaining: currentSub?.endsAt
        ? daysUntilEndsAt(currentSub.endsAt, today)
        : null,
    };
  },

  async findDuplicates(
    actor: ActorContext,
    input: { name: string; phone: string; birthDate?: Date | null },
  ) {
    const access = await requireGymPortalRead(actor);
    return gymMemberRepository.findDuplicateCandidates(access.gymId, {
      name: input.name,
      phone: normalizePhoneDigits(input.phone),
      birthDate: input.birthDate,
    });
  },

  async createMember(
    actor: ActorContext,
    input: GymMemberCreateInput,
  ): Promise<{
    memberId: string;
    memberNumber: string;
    fighterId?: string;
    loginCredentials?: { loginId: string; temporaryPassword: string };
    duplicates?: Awaited<
      ReturnType<typeof gymMemberRepository.findDuplicateCandidates>
    >;
  }> {
    const access = await requireGymPortalWrite(actor);
    const gymId = access.gymId;
    const phone = normalizeGymFighterPhone(input.phone);
    if (!phone) {
      throw new AppError("VALIDATION_ERROR", "휴대전화번호를 입력해 주세요.");
    }

    const duplicates = await gymMemberRepository.findDuplicateCandidates(
      gymId,
      {
        name: input.name,
        phone,
        birthDate: input.birthDate ?? null,
      },
    );
    if (duplicates.length > 0 && !input.confirmDuplicate) {
      throw new AppError(
        "CONFLICT",
        "비슷한 회원이 이미 등록되어 있습니다.",
        { candidates: duplicates },
      );
    }

    if (input.registerAsFighter) {
      if (!input.birthDate || !input.gender) {
        throw new AppError(
          "VALIDATION_ERROR",
          "선수로 등록하려면 생년월일과 성별이 필요합니다.",
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      let memberNumber = await gymMemberRepository.nextMemberNumber(gymId, tx);
      let member: { id: string; memberNumber: string } | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          member = await gymMemberRepository.create(
            {
              gym: { connect: { id: gymId } },
              memberNumber,
              name: input.name.trim(),
              phone,
              normalizedPhone: phone,
              birthDate: input.birthDate
                ? toUtcDateOnly(input.birthDate)
                : null,
              gender: input.gender ?? null,
              email: input.email ?? null,
              postalCode: input.postalCode ?? null,
              address: input.address ?? null,
              addressDetail: input.addressDetail ?? null,
              emergencyContactName: input.emergencyContactName ?? null,
              emergencyContactPhone: input.emergencyContactPhone
                ? normalizePhoneDigits(input.emergencyContactPhone)
                : null,
              guardianName: input.guardianName ?? null,
              guardianPhone: input.guardianPhone
                ? normalizeGymFighterPhone(input.guardianPhone)
                : null,
              joinedAt: input.joinedAt
                ? toUtcDateOnly(input.joinedAt)
                : toUtcDateOnly(new Date()),
              primarySport: input.primarySport ?? null,
              rankName: input.rankName ?? null,
              memo: input.memo ?? null,
              smsOptOut: input.smsOptOut ?? false,
              createdByUserId: actor.userId,
              updatedByUserId: actor.userId,
            },
            tx,
          );
          break;
        } catch (e) {
          if (
            isPrismaUniqueViolation(e) &&
            attempt < 2
          ) {
            memberNumber = await gymMemberRepository.nextMemberNumber(
              gymId,
              tx,
            );
            continue;
          }
          throw e;
        }
      }

      if (!member) {
        throw new AppError("INTERNAL", "회원 생성에 실패했습니다.");
      }

      let fighterId: string | undefined;

      if (input.registerAsFighter && input.birthDate && input.gender) {
        const fighterCode = await fighterService.generateFighterCode(tx);
        const fighter = await fighterRepository.createFighterWithGymHistory(
          tx,
          {
            fighterCode,
            name: input.name.trim(),
            birthDate: toUtcDateOnly(input.birthDate),
            gender: input.gender,
            phone,
            height: input.height ?? null,
            weight: input.weight ?? null,
            primarySport:
              input.fighterPrimarySport ?? input.primarySport ?? null,
            guardianName: input.guardianName ?? null,
            guardianPhone: input.guardianPhone
              ? normalizeGymFighterPhone(input.guardianPhone)
              : null,
            currentGymId: gymId,
            gymMemberId: member.id,
          },
        );
        fighterId = fighter.id;
      }

      if (input.planId) {
        const plan = await tx.gymMembershipPlan.findFirst({
          where: {
            id: input.planId,
            gymId,
            deletedAt: null,
            isActive: true,
          },
        });
        if (!plan) {
          throw new AppError("NOT_FOUND", "이용권을 찾을 수 없습니다.");
        }
        const startedAt = input.subscriptionStartedAt
          ? toUtcDateOnly(input.subscriptionStartedAt)
          : toUtcDateOnly(new Date());
        const endsAt =
          input.subscriptionEndsAt
            ? toUtcDateOnly(input.subscriptionEndsAt)
            : addDuration(startedAt, plan.durationType, plan.durationValue);

        const sub = await tx.gymMemberSubscription.create({
          data: {
            gymId,
            gymMemberId: member.id,
            planId: plan.id,
            planNameSnapshot: plan.name,
            priceSnapshot: plan.price,
            startedAt,
            endsAt,
            status: GymMemberSubscriptionStatus.active,
            createdByUserId: actor.userId,
          },
        });

        if (input.paymentAmount && input.paymentAmount > 0) {
          await tx.gymMemberPayment.create({
            data: {
              gymId,
              gymMemberId: member.id,
              subscriptionId: sub.id,
              paidAt: startedAt,
              amount: input.paymentAmount,
              paymentMethod:
                input.paymentMethod ?? GymMemberPaymentMethod.cash,
              status: GymMemberPaymentStatus.paid,
              memo: input.paymentMemo ?? null,
              createdByUserId: actor.userId,
            },
          });
        }
      }

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_member_created,
          targetType: "GymMember",
          targetId: member.id,
          afterData: {
            memberNumber: member.memberNumber,
            name: input.name.trim(),
            fighterId: fighterId ?? null,
          },
        },
        tx,
      );

      return { memberId: member.id, memberNumber: member.memberNumber, fighterId };
    });

    let loginCredentials:
      | { loginId: string; temporaryPassword: string }
      | undefined;
    if (
      result.fighterId &&
      input.createLoginAccount &&
      input.loginId
    ) {
      loginCredentials = await fighterService.provisionLoginAfterCreate(
        result.fighterId,
        {
          loginId: input.loginId,
          password: input.password,
          autoGeneratePassword: !input.password,
        },
      );
    }

    return { ...result, loginCredentials };
  },

  async updateMember(
    actor: ActorContext,
    memberId: string,
    input: GymMemberUpdateInput,
  ) {
    const { access, member } = await assertMemberOwned(actor, memberId, true);
    const phone = normalizeGymFighterPhone(input.phone);
    if (!phone) {
      throw new AppError("VALIDATION_ERROR", "휴대전화번호를 입력해 주세요.");
    }

    await prisma.$transaction(async (tx) => {
      await gymMemberRepository.update(
        memberId,
        {
          name: input.name.trim(),
          phone,
          normalizedPhone: phone,
          birthDate: input.birthDate
            ? toUtcDateOnly(input.birthDate)
            : null,
          gender: input.gender ?? null,
          email: input.email ?? null,
          postalCode: input.postalCode ?? null,
          address: input.address ?? null,
          addressDetail: input.addressDetail ?? null,
          emergencyContactName: input.emergencyContactName ?? null,
          emergencyContactPhone: input.emergencyContactPhone
            ? normalizePhoneDigits(input.emergencyContactPhone)
            : null,
          guardianName: input.guardianName ?? null,
          guardianPhone: input.guardianPhone
            ? normalizeGymFighterPhone(input.guardianPhone)
            : null,
          primarySport: input.primarySport ?? null,
          rankName: input.rankName ?? null,
          memo: input.memo ?? null,
          smsOptOut: input.smsOptOut ?? false,
          joinedAt: input.joinedAt
            ? toUtcDateOnly(input.joinedAt)
            : member.joinedAt,
          updatedByUserId: actor.userId,
        },
        tx,
      );

      if (member.fighter) {
        await tx.fighter.update({
          where: { id: member.fighter.id },
          data: syncFighterBasicFromMember({
            name: input.name.trim(),
            birthDate: input.birthDate
              ? toUtcDateOnly(input.birthDate)
              : member.birthDate,
            gender: input.gender ?? member.gender,
            phone,
            guardianName: input.guardianName ?? null,
            guardianPhone: input.guardianPhone
              ? normalizeGymFighterPhone(input.guardianPhone)
              : null,
            primarySport: input.primarySport ?? null,
          }),
        });
      }

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_member_updated,
          targetType: "GymMember",
          targetId: memberId,
          afterData: { name: input.name.trim(), gymId: access.gymId },
        },
        tx,
      );
    });
  },

  async setMemberStatus(
    actor: ActorContext,
    memberId: string,
    status: GymMemberStatus,
    reason?: string,
  ) {
    const { member } = await assertMemberOwned(actor, memberId, true);
    const action =
      status === GymMemberStatus.paused
        ? AuditAction.gym_member_paused
        : status === GymMemberStatus.withdrawn
          ? AuditAction.gym_member_withdrawn
          : AuditAction.gym_member_resumed;

    await prisma.$transaction(async (tx) => {
      await gymMemberRepository.update(
        memberId,
        {
          status,
          updatedByUserId: actor.userId,
        },
        tx,
      );

      if (status === GymMemberStatus.paused) {
        const activeSub = member.subscriptions.find(
          (s) => s.status === GymMemberSubscriptionStatus.active,
        );
        if (activeSub) {
          await tx.gymMemberSubscription.update({
            where: { id: activeSub.id },
            data: {
              status: GymMemberSubscriptionStatus.paused,
              pausedAt: new Date(),
            },
          });
        }
      }

      if (
        status === GymMemberStatus.active &&
        member.status === GymMemberStatus.paused
      ) {
        const pausedSub = member.subscriptions.find(
          (s) => s.status === GymMemberSubscriptionStatus.paused,
        );
        if (pausedSub) {
          await tx.gymMemberSubscription.update({
            where: { id: pausedSub.id },
            data: {
              status: GymMemberSubscriptionStatus.active,
              resumedAt: new Date(),
            },
          });
        }
      }

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action,
          targetType: "GymMember",
          targetId: memberId,
          afterData: { status, reason: reason ?? null },
        },
        tx,
      );
    });
  },

  async softDeleteMember(actor: ActorContext, memberId: string) {
    await assertMemberOwned(actor, memberId, true);
    await prisma.$transaction(async (tx) => {
      await gymMemberRepository.softDelete(memberId, tx);
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_member_withdrawn,
          targetType: "GymMember",
          targetId: memberId,
          afterData: { op: "soft_delete" },
        },
        tx,
      );
    });
  },

  async promoteToFighter(
    actor: ActorContext,
    memberId: string,
    input: {
      height?: number;
      weight?: number;
      primarySport?: string;
      createLoginAccount?: boolean;
      loginId?: string;
      password?: string;
    },
  ) {
    const { access, member } = await assertMemberOwned(actor, memberId, true);
    if (member.fighter) {
      throw new AppError(
        "CONFLICT",
        "이미 선수로 등록된 회원입니다.",
      );
    }
    if (!member.birthDate || !member.gender) {
      throw new AppError(
        "VALIDATION_ERROR",
        "선수로 등록하려면 생년월일과 성별이 필요합니다.",
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const fighterCode = await fighterService.generateFighterCode(tx);
      const fighter = await fighterRepository.createFighterWithGymHistory(tx, {
        fighterCode,
        name: member.name,
        birthDate: member.birthDate!,
        gender: member.gender!,
        phone: member.phone,
        height: input.height ?? null,
        weight: input.weight ?? null,
        primarySport: input.primarySport ?? member.primarySport ?? null,
        guardianName: member.guardianName,
        guardianPhone: member.guardianPhone,
        currentGymId: access.gymId,
        gymMemberId: member.id,
      });

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_member_fighter_linked,
          targetType: "GymMember",
          targetId: memberId,
          afterData: { fighterId: fighter.id, op: "promote" },
        },
        tx,
      );

      return fighter;
    });

    let loginCredentials:
      | { loginId: string; temporaryPassword: string }
      | undefined;
    if (input.createLoginAccount && input.loginId) {
      loginCredentials = await fighterService.provisionLoginAfterCreate(
        created.id,
        {
          loginId: input.loginId,
          password: input.password,
          autoGeneratePassword: !input.password,
        },
      );
    }

    return { fighterId: created.id, fighterCode: created.fighterCode, loginCredentials };
  },

  async linkExistingFighter(
    actor: ActorContext,
    memberId: string,
    fighterId: string,
  ) {
    const { access, member } = await assertMemberOwned(actor, memberId, true);
    if (member.fighter) {
      throw new AppError("CONFLICT", "이미 선수가 연결된 회원입니다.");
    }

    const fighter = await prisma.fighter.findFirst({
      where: {
        id: fighterId,
        currentGymId: access.gymId,
        gymMemberId: null,
      },
      select: { id: true },
    });
    if (!fighter) {
      throw new AppError(
        "NOT_FOUND",
        "연결 가능한 소속 선수를 찾을 수 없습니다.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.fighter.update({
        where: { id: fighterId },
        data: {
          gymMemberId: memberId,
          ...syncFighterBasicFromMember({
            name: member.name,
            birthDate: member.birthDate,
            gender: member.gender,
            phone: member.phone,
            guardianName: member.guardianName,
            guardianPhone: member.guardianPhone,
            primarySport: member.primarySport,
          }),
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_member_fighter_linked,
          targetType: "GymMember",
          targetId: memberId,
          afterData: { fighterId, op: "link" },
        },
        tx,
      );
    });
  },

  async ensureMemberForFighterCreate(
    actor: ActorContext,
    memberId: string | undefined,
    createInput: GymMemberCreateInput,
  ) {
    if (memberId) {
      const { member } = await assertMemberOwned(actor, memberId, true);
      if (member.fighter) {
        throw new AppError("CONFLICT", "이미 선수로 등록된 회원입니다.");
      }
      return { memberId: member.id, created: false as const };
    }
    const created = await gymMemberService.createMember(actor, {
      ...createInput,
      registerAsFighter: true,
    });
    return {
      memberId: created.memberId,
      fighterId: created.fighterId,
      loginCredentials: created.loginCredentials,
      created: true as const,
    };
  },

  todayLabel(): string {
    return todayUtcDateOnlyString();
  },
};
