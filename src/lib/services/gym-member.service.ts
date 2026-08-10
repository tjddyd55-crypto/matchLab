import "server-only";

import {
  AuditAction,
  GymMemberPaymentMethod,
  GymMemberPaymentStatus,
  GymMemberStatus,
  GymMemberSubscriptionStatus,
  GymSalesCategory,
} from "@/lib/enums";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { toUtcDateOnly, todayUtcDateOnlyString } from "@/lib/date-only";
import { normalizePhoneDigits } from "@/lib/phone";
import { assertGymMemberImagePath } from "@/lib/constants/gym-member-image-upload";

/** Remote Railway Postgres proxy: member create may include groups/locker/payment. */
const GYM_MEMBER_TX = { maxWait: 15_000, timeout: 30_000 } as const;
import { normalizeGymFighterPhone } from "@/lib/gym-fighter-management";
import {
  createGymMemberImageSignedReadUrlForPath,
  createGymMemberImageSignedReadUrlMap,
  removeGymMemberImageObject,
} from "@/lib/services/gym-member-image.service";
import {
  requireGymPortalRead,
  requireGymPortalWrite,
} from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { gymMemberRepository } from "@/lib/repositories/gym-member.repository";
import { gymMemberGroupRepository } from "@/lib/repositories/gym-member-group.repository";
import { gymMemberLockerRepository } from "@/lib/repositories/gym-member-locker.repository";
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
import { addMembershipDuration } from "@/lib/gym-member/membership-duration";
import {
  lockerRangesOverlap,
  normalizeLockerLabel,
} from "@/lib/gym-member/locker-label";

export type { GymMemberCreateInput, GymMemberUpdateInput };

function resolveGuardianFields(input: {
  guardianName?: string | null;
  guardianPhone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}) {
  const name =
    (input.guardianName?.trim() ||
      input.emergencyContactName?.trim() ||
      "") || null;
  const phoneRaw =
    input.guardianPhone?.trim() ||
    input.emergencyContactPhone?.trim() ||
    "";
  const phone = phoneRaw ? normalizeGymFighterPhone(phoneRaw) : null;
  return {
    guardianName: name,
    guardianPhone: phone,
    emergencyContactName: name,
    emergencyContactPhone: phone,
  };
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

/**
 * 회원 사진 경로는 항상 체육관 범위로 다시 검증한다.
 * (폼에서 넘어온 값이므로 신뢰 경계 밖의 입력으로 취급한다.)
 */
function assertOwnedImagePath(
  gymId: string,
  path: string | null | undefined,
): string | null {
  const trimmed = path?.trim();
  if (!trimmed) return null;
  try {
    assertGymMemberImagePath(trimmed, gymId);
  } catch {
    throw new AppError("VALIDATION_ERROR", "사진 경로가 올바르지 않습니다.");
  }
  return trimmed;
}

export type GymMemberListItemVM = {
  id: string;
  memberNumber: string;
  name: string;
  phone: string;
  profileImageUrl: string | null;
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
  groupNames: string[];
  rankName: string | null;
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
      joinedFilter?: "all" | "this-month";
      planId?: string;
      groupId?: string;
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
      joinedFilter: filters.joinedFilter,
      planId: filters.planId,
      groupId: filters.groupId,
      skip,
      take: pageSize,
    });

    const today = todayUtcDateOnly();
    const imageUrlByPath = await createGymMemberImageSignedReadUrlMap(
      access.gymId,
      rows.map((row) => row.profileImagePath),
    );
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
        profileImageUrl: row.profileImagePath
          ? (imageUrlByPath.get(row.profileImagePath) ?? null)
          : null,
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
        groupNames: (row.groupAssignments ?? [])
          .map((a) => a.group?.name)
          .filter((n): n is string => Boolean(n)),
        rankName: row.rankName ?? null,
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
    const { access, member } = await assertMemberOwned(actor, memberId, false);
    const today = todayUtcDateOnly();
    const profileImageUrl = member.profileImagePath
      ? await createGymMemberImageSignedReadUrlForPath(
          access.gymId,
          member.profileImagePath,
        )
      : null;
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
      profileImageUrl,
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

    const profileImagePath = assertOwnedImagePath(
      gymId,
      input.profileImagePath,
    );
    const guardian = resolveGuardianFields(input);

    if (input.registerAsFighter) {
      if (!input.birthDate || !input.gender) {
        throw new AppError(
          "VALIDATION_ERROR",
          "선수로 등록하려면 생년월일과 성별이 필요합니다.",
        );
      }
    }

    if (input.lockerEnabled) {
      const label = input.lockerLabel?.trim();
      if (!label) {
        throw new AppError(
          "VALIDATION_ERROR",
          "사물함 번호를 입력해 주세요.",
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
              emergencyContactName: guardian.emergencyContactName,
              emergencyContactPhone: guardian.emergencyContactPhone,
              guardianName: guardian.guardianName,
              guardianPhone: guardian.guardianPhone,
              joinedAt: input.joinedAt
                ? toUtcDateOnly(input.joinedAt)
                : toUtcDateOnly(new Date()),
              primarySport: input.primarySport ?? null,
              rankName: input.rankName ?? null,
              memo: input.memo ?? null,
              profileImagePath,
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

      if (input.groupIds.length > 0) {
        await gymMemberGroupRepository.replaceMemberGroups(
          gymId,
          member.id,
          input.groupIds,
          tx,
        );
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
            guardianName: guardian.guardianName,
            guardianPhone: guardian.guardianPhone,
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
        const endsAt = input.subscriptionEndsAt
          ? toUtcDateOnly(input.subscriptionEndsAt)
          : addMembershipDuration(
              startedAt,
              plan.durationType,
              plan.durationValue,
            );

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
              category: GymSalesCategory.membership,
              memo: input.paymentMemo ?? null,
              createdByUserId: actor.userId,
            },
          });
        }
      }

      if (input.lockerEnabled && input.lockerLabel?.trim()) {
        const label = normalizeLockerLabel(input.lockerLabel);
        const lockerStarted = input.lockerStartedAt
          ? toUtcDateOnly(input.lockerStartedAt)
          : toUtcDateOnly(new Date());
        const lockerEnds = input.lockerEndsAt
          ? toUtcDateOnly(input.lockerEndsAt)
          : null;
        const lockerAmount = input.lockerAmount ?? 0;
        if (lockerAmount < 0) {
          throw new AppError(
            "VALIDATION_ERROR",
            "사물함 이용금액이 올바르지 않습니다.",
          );
        }
        if (lockerEnds && lockerEnds.getTime() < lockerStarted.getTime()) {
          throw new AppError(
            "VALIDATION_ERROR",
            "사물함 종료일은 시작일 이후여야 합니다.",
          );
        }
        const openSameLabel =
          await gymMemberLockerRepository.findOpenByLabel(gymId, label, tx);
        const conflict = openSameLabel.find((row) =>
          lockerRangesOverlap(
            { startedAt: row.startedAt, endsAt: row.endsAt },
            { startedAt: lockerStarted, endsAt: lockerEnds },
          ),
        );
        if (conflict) {
          throw new AppError(
            "CONFLICT",
            "같은 기간에 이미 사용 중인 사물함 번호입니다.",
          );
        }

        let paymentId: string | undefined;
        if (lockerAmount > 0) {
          const payment = await tx.gymMemberPayment.create({
            data: {
              gymId,
              gymMemberId: member.id,
              paidAt: lockerStarted,
              amount: lockerAmount,
              paymentMethod:
                input.paymentMethod ?? GymMemberPaymentMethod.cash,
              status: GymMemberPaymentStatus.paid,
              category: GymSalesCategory.locker,
              memo: `사물함 ${label}`,
              createdByUserId: actor.userId,
            },
          });
          paymentId = payment.id;
        }

        // Unchecked scalar FKs — nested connect can fail under interactive tx + pg adapter.
        await gymMemberLockerRepository.createUnchecked(
          {
            gymId,
            gymMemberId: member.id,
            lockerLabel: label,
            startedAt: lockerStarted,
            endsAt: lockerEnds,
            amount: lockerAmount,
            memo: input.lockerMemo ?? null,
            createdByUserId: actor.userId,
            updatedByUserId: actor.userId,
            paymentId: paymentId ?? null,
          },
          tx,
        );
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
            hasProfileImage: Boolean(profileImagePath),
            groupCount: input.groupIds.length,
            lockerEnabled: Boolean(input.lockerEnabled),
          },
        },
        tx,
      );

      return { memberId: member.id, memberNumber: member.memberNumber, fighterId };
    }, GYM_MEMBER_TX);

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
    const guardian = resolveGuardianFields(input);

    const uploadedImagePath = assertOwnedImagePath(
      access.gymId,
      input.profileImagePath,
    );
    /** 업로드 > 제거 > 유지 순으로 결정한다. */
    const nextImagePath = uploadedImagePath
      ? uploadedImagePath
      : input.removeProfileImage
        ? null
        : member.profileImagePath;
    const replacedImagePath =
      member.profileImagePath && member.profileImagePath !== nextImagePath
        ? member.profileImagePath
        : null;

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
          emergencyContactName: guardian.emergencyContactName,
          emergencyContactPhone: guardian.emergencyContactPhone,
          guardianName: guardian.guardianName,
          guardianPhone: guardian.guardianPhone,
          primarySport: input.primarySport ?? null,
          rankName: input.rankName ?? null,
          memo: input.memo ?? null,
          profileImagePath: nextImagePath,
          smsOptOut: input.smsOptOut ?? false,
          joinedAt: input.joinedAt
            ? toUtcDateOnly(input.joinedAt)
            : member.joinedAt,
          updatedByUserId: actor.userId,
        },
        tx,
      );

      if (input.groupIds !== undefined) {
        await gymMemberGroupRepository.replaceMemberGroups(
          access.gymId,
          memberId,
          input.groupIds,
          tx,
        );
      }

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
            guardianName: guardian.guardianName,
            guardianPhone: guardian.guardianPhone,
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

      if (nextImagePath !== member.profileImagePath) {
        await auditRepository.createAuditLog(
          {
            actorUserId: actor.userId,
            action: nextImagePath
              ? AuditAction.gym_member_profile_image_changed
              : AuditAction.gym_member_profile_image_removed,
            targetType: "GymMember",
            targetId: memberId,
            afterData: { hasImage: Boolean(nextImagePath) },
          },
          tx,
        );
      }
    });

    // 커밋 이후에만 정리한다 (롤백 시 사진이 사라지는 것을 막는다).
    await removeGymMemberImageObject(replacedImagePath);
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
