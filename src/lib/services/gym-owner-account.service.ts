import "server-only";

import { randomBytes } from "node:crypto";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { AuditAction, UserRole } from "@/lib/enums";
import {
  buildMemberGymOwnerInviteUrl,
  generateMemberGymOwnerInviteToken,
  hashMemberGymOwnerInviteToken,
  isPlaceholderGymOwnerUser,
  MEMBER_GYM_OWNER_INVITE_TTL_MS,
  resolveMemberGymOwnerAccountStatus,
  resolveMemberGymOwnerDisplay,
} from "@/lib/member-gym/owner-account";
import { normalizePhoneDigits } from "@/lib/phone";
import { requireAssociationOrganizerScope } from "@/lib/permissions";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { memberGymRepository } from "@/lib/repositories/member-gym.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loginIdToAuthEmail } from "@/lib/fighter-login";
import { loginIdSchema } from "@/lib/validators/login-id.validator";
import { passwordSchema } from "@/lib/validators/password.validator";

async function loadScopedMemberGym(
  actor: ActorContext,
  memberGymId: string,
  organizerIdHint?: string | null,
) {
  const organizerId = await requireAssociationOrganizerScope(actor, organizerIdHint);
  const row = await memberGymRepository.findMemberGymById(
    organizerId,
    memberGymId,
  );
  if (!row) throw new AppError("NOT_FOUND", "회원사를 찾을 수 없습니다.");
  return { organizerId, row };
}

function clearInviteData() {
  return {
    ownerInviteTokenHash: null,
    ownerInviteExpiresAt: null,
    ownerInviteEmail: null,
    ownerInviteName: null,
    ownerInvitePhone: null,
    ownerInviteCreatedAt: null,
    ownerInviteCreatedByUserId: null,
  };
}

export const gymOwnerAccountService = {
  async searchUsersForOwnerConnect(
    actor: ActorContext,
    memberGymId: string,
    query: { email?: string; phone?: string; name?: string },
    organizerIdHint?: string | null,
  ) {
    await loadScopedMemberGym(actor, memberGymId, organizerIdHint);
    const email = query.email?.trim().toLowerCase();
    const phone = query.phone?.trim();
    const name = query.name?.trim();
    if (!email && !phone && !name) {
      throw new AppError("VALIDATION_ERROR", "검색어를 입력해 주세요.");
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          email ? { email: { equals: email, mode: "insensitive" } } : {},
          phone ? { phone: { contains: phone } } : {},
          name ? { name: { contains: name, mode: "insensitive" } } : {},
        ],
      },
      take: 20,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        loginId: true,
        authUserId: true,
        ownedGym: { select: { id: true, name: true } },
        organizer: { select: { id: true } },
        fighter: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      loginId: u.loginId,
      canConnect:
        !u.ownedGym &&
        !u.organizer &&
        !u.fighter &&
        u.role !== UserRole.admin &&
        u.role !== UserRole.organizer &&
        u.role !== UserRole.fighter,
      blockReason: u.ownedGym
        ? `이미 체육관「${u.ownedGym.name}」소유자입니다.`
        : u.organizer || u.role === UserRole.organizer
          ? "주최자 계정은 연결할 수 없습니다."
          : u.role === UserRole.admin
            ? "관리자 계정은 연결할 수 없습니다."
            : u.fighter || u.role === UserRole.fighter
              ? "선수 계정은 연결할 수 없습니다."
              : null,
      ownsGymId: u.ownedGym?.id ?? null,
      isPlaceholder: isPlaceholderGymOwnerUser(u),
    }));
  },

  async connectExistingOwner(
    actor: ActorContext,
    input: { memberGymId: string; targetUserId: string },
    organizerIdHint?: string | null,
  ) {
    const { organizerId, row } = await loadScopedMemberGym(
      actor,
      input.memberGymId,
      organizerIdHint,
    );
    const target = await prisma.user.findUnique({
      where: { id: input.targetUserId },
      include: {
        ownedGym: { select: { id: true, name: true } },
        organizer: { select: { id: true } },
        fighter: { select: { id: true } },
      },
    });
    if (!target) throw new AppError("NOT_FOUND", "사용자를 찾을 수 없습니다.");
    if (target.role === UserRole.admin || target.role === UserRole.organizer) {
      throw new AppError("FORBIDDEN", "해당 역할의 계정은 연결할 수 없습니다.");
    }
    if (target.organizer) {
      throw new AppError("FORBIDDEN", "주최자 계정은 연결할 수 없습니다.");
    }
    if (target.fighter) {
      throw new AppError("FORBIDDEN", "선수 계정은 연결할 수 없습니다.");
    }
    if (target.ownedGym && target.ownedGym.id !== row.gymId) {
      throw new AppError(
        "CONFLICT",
        `이미 다른 체육관「${target.ownedGym.name}」의 대표 계정입니다.`,
      );
    }

    const previousOwnerId = row.gym.ownerUserId;
    if (previousOwnerId === target.id) {
      await memberGymRepository.updateMemberGym(row.id, {
        ...clearInviteData(),
        ownerAccessSuspendedAt: null,
      });
      return { gymId: row.gymId, userId: target.id, idempotent: true };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: target.id },
        data: { role: UserRole.gym },
      });
      await tx.gym.update({
        where: { id: row.gymId },
        data: { ownerUserId: target.id },
      });
      await tx.associationMemberGym.update({
        where: { id: row.id },
        data: {
          ...clearInviteData(),
          ownerAccessSuspendedAt: null,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: previousOwnerId
            ? AuditAction.gym_owner_replaced
            : AuditAction.gym_owner_connected,
          targetType: "AssociationMemberGym",
          targetId: row.id,
          beforeData: {
            gymId: row.gymId,
            previousOwnerId,
            organizerId,
          },
          afterData: {
            gymId: row.gymId,
            ownerUserId: target.id,
          },
        },
        tx,
      );
    });

    return { gymId: row.gymId, userId: target.id, idempotent: false };
  },

  async createOwnerInvite(
    actor: ActorContext,
    input: {
      memberGymId: string;
      name: string;
      email: string;
      phone?: string;
    },
    organizerIdHint?: string | null,
  ) {
    const { organizerId, row } = await loadScopedMemberGym(
      actor,
      input.memberGymId,
      organizerIdHint,
    );
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    if (!email || !name) {
      throw new AppError("VALIDATION_ERROR", "이름과 이메일이 필요합니다.");
    }

    const existing = await userRepository.findUserByEmail(email);
    if (existing) {
      throw new AppError(
        "CONFLICT",
        "이미 등록된 이메일입니다. 기존 계정 연결을 사용해 주세요.",
      );
    }

    const token = generateMemberGymOwnerInviteToken();
    const tokenHash = hashMemberGymOwnerInviteToken(token);
    const expiresAt = new Date(Date.now() + MEMBER_GYM_OWNER_INVITE_TTL_MS);

    await prisma.$transaction(async (tx) => {
      await tx.associationMemberGym.update({
        where: { id: row.id },
        data: {
          ownerInviteTokenHash: tokenHash,
          ownerInviteExpiresAt: expiresAt,
          ownerInviteEmail: email,
          ownerInviteName: name,
          ownerInvitePhone: input.phone?.trim()
            ? normalizePhoneDigits(input.phone)
            : null,
          ownerInviteCreatedAt: new Date(),
          ownerInviteCreatedByUserId: actor.userId,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_owner_invited,
          targetType: "AssociationMemberGym",
          targetId: row.id,
          afterData: {
            organizerId,
            gymId: row.gymId,
            email,
            expiresAt: expiresAt.toISOString(),
          },
        },
        tx,
      );
    });

    return {
      inviteUrl: buildMemberGymOwnerInviteUrl(token),
      expiresAt,
      email,
    };
  },

  async cancelOwnerInvite(
    actor: ActorContext,
    memberGymId: string,
    organizerIdHint?: string | null,
  ) {
    const { organizerId, row } = await loadScopedMemberGym(
      actor,
      memberGymId,
      organizerIdHint,
    );
    await prisma.$transaction(async (tx) => {
      await tx.associationMemberGym.update({
        where: { id: row.id },
        data: clearInviteData(),
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_owner_invite_cancelled,
          targetType: "AssociationMemberGym",
          targetId: row.id,
          afterData: { organizerId, gymId: row.gymId },
        },
        tx,
      );
    });
    return { ok: true as const };
  },

  async setOwnerAccessSuspended(
    actor: ActorContext,
    memberGymId: string,
    suspended: boolean,
    organizerIdHint?: string | null,
  ) {
    const { organizerId, row } = await loadScopedMemberGym(
      actor,
      memberGymId,
      organizerIdHint,
    );
    await prisma.$transaction(async (tx) => {
      await tx.associationMemberGym.update({
        where: { id: row.id },
        data: {
          ownerAccessSuspendedAt: suspended ? new Date() : null,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: suspended
            ? AuditAction.gym_owner_access_suspended
            : AuditAction.gym_owner_access_restored,
          targetType: "AssociationMemberGym",
          targetId: row.id,
          afterData: { organizerId, gymId: row.gymId, suspended },
        },
        tx,
      );
    });
    return { ok: true as const };
  },

  /**
   * ownerUserId는 NOT NULL — 연결 해제는 placeholder owner로 되돌림.
   */
  async disconnectOwnerToPlaceholder(
    actor: ActorContext,
    memberGymId: string,
    organizerIdHint?: string | null,
  ) {
    const { organizerId, row } = await loadScopedMemberGym(
      actor,
      memberGymId,
      organizerIdHint,
    );
    const previousOwnerId = row.gym.ownerUserId;

    await prisma.$transaction(async (tx) => {
      const suffix = randomBytes(6).toString("hex");
      const owner = await tx.user.create({
        data: {
          loginId: `manual-gym-${suffix}`,
          email: `manual-gym-${suffix}@internal.invalid`,
          name: row.gym.name,
          role: UserRole.gym,
        },
        select: { id: true },
      });
      await tx.gym.update({
        where: { id: row.gymId },
        data: { ownerUserId: owner.id },
      });
      await tx.associationMemberGym.update({
        where: { id: row.id },
        data: {
          ...clearInviteData(),
          ownerAccessSuspendedAt: null,
        },
      });
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.gym_owner_replaced,
          targetType: "AssociationMemberGym",
          targetId: row.id,
          beforeData: { previousOwnerId, organizerId, gymId: row.gymId },
          afterData: { ownerUserId: owner.id, placeholder: true },
        },
        tx,
      );
    });

    return { ok: true as const };
  },

  async getInviteContextByToken(token: string) {
    const tokenHash = hashMemberGymOwnerInviteToken(token);
    const row =
      await memberGymRepository.findMemberGymByOwnerInviteTokenHash(tokenHash);
    if (!row) {
      return { ok: false as const, reason: "invalid" as const };
    }
    if (
      row.ownerInviteExpiresAt &&
      row.ownerInviteExpiresAt.getTime() <= Date.now()
    ) {
      return { ok: false as const, reason: "expired" as const };
    }
    return {
      ok: true as const,
      memberGymId: row.id,
      gymName: row.gym.name,
      organizerName: row.organizer.name,
      email: row.ownerInviteEmail!,
      name: row.ownerInviteName!,
      phone: row.ownerInvitePhone,
      expiresAt: row.ownerInviteExpiresAt!,
    };
  },

  /** 초대 수락 전 아이디 중복 확인 (버튼) */
  async isLoginIdAvailableForInvite(loginIdRaw: string): Promise<{
    available: boolean;
    loginId: string;
    message?: string;
  }> {
    const parsed = loginIdSchema.safeParse(loginIdRaw);
    if (!parsed.success) {
      return {
        available: false,
        loginId: loginIdRaw.trim().toLowerCase(),
        message:
          parsed.error.issues[0]?.message ??
          "영문 소문자, 숫자, _, -를 사용해 4~20자로 입력해 주세요.",
      };
    }
    const loginId = parsed.data;
    const taken = await prisma.user.findFirst({
      where: { loginId },
      select: { id: true },
    });
    if (taken) {
      return {
        available: false,
        loginId,
        message:
          "이미 사용 중인 아이디입니다.\n다른 아이디를 입력해 주세요.",
      };
    }
    const authEmail = loginIdToAuthEmail(loginId);
    const emailTaken = await prisma.user.findFirst({
      where: { email: { equals: authEmail, mode: "insensitive" } },
      select: { id: true },
    });
    if (emailTaken) {
      return {
        available: false,
        loginId,
        message:
          "이미 사용 중인 아이디입니다.\n다른 아이디를 입력해 주세요.",
      };
    }
    return {
      available: true,
      loginId,
      message: "사용 가능한 아이디입니다.",
    };
  },

  /**
   * 초대 활성화 시 User.email에 신청 이메일을 넣어 Auth와 어긋난 계정을
   * loginId → Auth email SSOT로 정렬한다. 비밀번호는 변경하지 않는다.
   */
  async repairOwnerAuthEmailAlignment(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        loginId: true,
        email: true,
        authUserId: true,
      },
    });
    if (!user || user.role !== UserRole.gym || !user.loginId || !user.authUserId) {
      return { repaired: false as const, reason: "ineligible" as const };
    }
    const authEmail = loginIdToAuthEmail(user.loginId);
    if (
      user.email &&
      user.email.toLowerCase() === authEmail.toLowerCase()
    ) {
      return { repaired: false as const, reason: "already_aligned" as const };
    }
    // 데모/@demo.local 등 기존 이메일 기반 Auth 계정은 건드리지 않음
    if (user.email?.toLowerCase().endsWith("@demo.local")) {
      return { repaired: false as const, reason: "demo_skip" as const };
    }
    const clash = await prisma.user.findFirst({
      where: {
        email: { equals: authEmail, mode: "insensitive" },
        NOT: { id: user.id },
      },
      select: { id: true },
    });
    if (clash) {
      return { repaired: false as const, reason: "email_conflict" as const };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { email: authEmail },
    });
    return {
      repaired: true as const,
      userId: user.id,
      loginId: user.loginId,
      previousEmail: user.email,
      authEmail,
    };
  },

  async acceptOwnerInvite(
    token: string,
    input: { password: string; passwordConfirm: string; loginId: string },
  ) {
    const tokenHash = hashMemberGymOwnerInviteToken(token);
    const row =
      await memberGymRepository.findMemberGymByOwnerInviteTokenHash(tokenHash);
    if (!row || !row.ownerInviteEmail || !row.ownerInviteName) {
      throw new AppError(
        "FORBIDDEN",
        "이미 활성화된 계정입니다.\n로그인 화면에서 설정한 아이디와 비밀번호로 로그인해 주세요.",
      );
    }
    if (
      row.ownerInviteExpiresAt &&
      row.ownerInviteExpiresAt.getTime() <= Date.now()
    ) {
      throw new AppError(
        "FORBIDDEN",
        "계정 생성 링크가 만료되었습니다.\n협회에 새 링크를 요청해 주세요.",
      );
    }

    const loginParsed = loginIdSchema.safeParse(input.loginId);
    if (!loginParsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        loginParsed.error.issues[0]?.message ??
          "영문 소문자, 숫자, _, -를 사용해 4~20자로 입력해 주세요.",
      );
    }
    const loginId = loginParsed.data;

    // 비밀번호: 앞뒤 공백 임의 trim 금지 — schema·일치 검사는 raw 값
    if (input.password !== input.passwordConfirm) {
      throw new AppError("VALIDATION_ERROR", "비밀번호가 일치하지 않습니다.");
    }
    const passwordParsed = passwordSchema.safeParse(input.password);
    if (!passwordParsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        passwordParsed.error.issues[0]?.message ??
          "비밀번호는 8자 이상이어야 합니다.",
      );
    }
    const password = passwordParsed.data;

    if (await prisma.user.findFirst({ where: { loginId } })) {
      throw new AppError(
        "CONFLICT",
        "이미 사용 중인 아이디입니다.\n다른 아이디를 입력해 주세요.",
      );
    }

    const contactEmail = row.ownerInviteEmail.trim().toLowerCase();
    const existingByContactEmail = await prisma.user.findFirst({
      where: {
        email: { equals: contactEmail, mode: "insensitive" },
        authUserId: { not: null },
      },
      include: { ownedGym: { select: { id: true, name: true } } },
    });
    if (
      existingByContactEmail?.ownedGym &&
      existingByContactEmail.ownedGym.id !== row.gymId
    ) {
      throw new AppError(
        "CONFLICT",
        "이 이메일은 다른 체육관 계정으로 연결되어 있습니다.",
      );
    }
    if (
      existingByContactEmail &&
      existingByContactEmail.ownedGym?.id === row.gymId &&
      !isPlaceholderGymOwnerUser(existingByContactEmail)
    ) {
      // 과거 버그: User.email=신청 이메일 → Auth email 정렬
      if (existingByContactEmail.loginId) {
        await this.repairOwnerAuthEmailAlignment(existingByContactEmail.id);
      }
      await prisma.associationMemberGym.update({
        where: { id: row.id },
        data: clearInviteData(),
      });
      return {
        loginId: existingByContactEmail.loginId ?? loginId,
        contactEmail,
        alreadyActive: true as const,
      };
    }

    const authEmail = loginIdToAuthEmail(loginId);
    if (
      await prisma.user.findFirst({
        where: { email: { equals: authEmail, mode: "insensitive" } },
      })
    ) {
      throw new AppError(
        "CONFLICT",
        "이미 사용 중인 아이디입니다.\n다른 아이디를 입력해 주세요.",
      );
    }

    let supabase;
    try {
      supabase = createSupabaseAdminClient();
    } catch {
      throw new AppError(
        "INTERNAL",
        "계정 생성 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.",
      );
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
    });
    let authUserId = data.user?.id ?? null;
    if ((!authUserId || error) && error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("already") || msg.includes("registered")) {
        // Auth orphan(User 없음)이면 삭제 후 1회 재시도 — 기존 User가 있으면 아이디 충돌
        const listed = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        const orphan = (listed.data?.users || []).find(
          (u) => (u.email || "").toLowerCase() === authEmail.toLowerCase(),
        );
        if (orphan) {
          const linked = await prisma.user.findFirst({
            where: { authUserId: orphan.id },
            select: { id: true },
          });
          if (!linked) {
            await supabase.auth.admin.deleteUser(orphan.id);
            const retry = await supabase.auth.admin.createUser({
              email: authEmail,
              password,
              email_confirm: true,
            });
            if (retry.data.user?.id) {
              authUserId = retry.data.user.id;
            }
          }
        }
        if (!authUserId) {
          throw new AppError(
            "CONFLICT",
            "이미 사용 중인 아이디입니다.\n다른 아이디를 입력해 주세요.",
          );
        }
      } else {
        throw new AppError(
          "INTERNAL",
          "계정 생성 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.",
        );
      }
    }
    if (!authUserId) {
      throw new AppError(
        "INTERNAL",
        "계정 생성 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.",
      );
    }

    const previousOwnerId = row.gym.ownerUserId;
    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            authUserId,
            // Auth SSOT — 선수 계정과 동일 (loginId → synthetic email)
            email: authEmail,
            loginId,
            phone: row.ownerInvitePhone,
            name: row.ownerInviteName!,
            role: UserRole.gym,
            mustChangePassword: false,
            passwordIssuedAt: new Date(),
          },
        });
        await tx.gym.update({
          where: { id: row.gymId },
          data: { ownerUserId: user.id },
        });
        await tx.associationMemberGym.update({
          where: { id: row.id },
          data: {
            ...clearInviteData(),
            ownerAccessSuspendedAt: null,
          },
        });
        await auditRepository.createAuditLog(
          {
            actorUserId: user.id,
            action: AuditAction.gym_owner_connected,
            targetType: "AssociationMemberGym",
            targetId: row.id,
            beforeData: { previousOwnerId },
            afterData: {
              ownerUserId: user.id,
              via: "invite_accept",
              loginId,
              contactEmail,
            },
          },
          tx,
        );
      });
    } catch (e) {
      await supabase.auth.admin.deleteUser(authUserId).catch(() => undefined);
      if (e instanceof AppError) throw e;
      throw new AppError(
        "INTERNAL",
        "계정 생성 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.",
      );
    }

    return {
      loginId,
      contactEmail,
      alreadyActive: false as const,
    };
  },

  describeOwnerAccount(row: {
    ownerAccessSuspendedAt: Date | null;
    ownerInviteTokenHash: string | null;
    ownerInviteExpiresAt: Date | null;
    ownerInviteEmail: string | null;
    ownerInviteName?: string | null;
    ownerInvitePhone?: string | null;
    gym: {
      name?: string;
      phone?: string | null;
      ownerUser: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        loginId: string | null;
        role: UserRole;
        authUserId: string | null;
        createdAt?: Date;
      };
    };
    application?: {
      ownerName?: string | null;
      email?: string | null;
      phone?: string | null;
      contactPhone?: string | null;
    } | null;
  }) {
    const status = resolveMemberGymOwnerAccountStatus({
      owner: row.gym.ownerUser,
      ownerAccessSuspendedAt: row.ownerAccessSuspendedAt,
      ownerInviteTokenHash: row.ownerInviteTokenHash,
      ownerInviteExpiresAt: row.ownerInviteExpiresAt,
    });
    const display = resolveMemberGymOwnerDisplay({
      owner: row.gym.ownerUser,
      gymName: row.gym.name,
      gymPhone: row.gym.phone,
      inviteEmail: row.ownerInviteEmail,
      inviteName: row.ownerInviteName,
      invitePhone: row.ownerInvitePhone,
      application: row.application
        ? {
            ownerName: row.application.ownerName,
            email: row.application.email,
            phone: row.application.phone,
            contactPhone: row.application.contactPhone,
          }
        : null,
    });
    return {
      status,
      owner: row.gym.ownerUser,
      inviteEmail: row.ownerInviteEmail,
      inviteExpiresAt: row.ownerInviteExpiresAt,
      canLogin:
        Boolean(row.gym.ownerUser.authUserId) && !row.ownerAccessSuspendedAt,
      isPlaceholder: isPlaceholderGymOwnerUser(row.gym.ownerUser),
      displayName: display.displayName,
      displayEmail: display.displayEmail,
      displayPhone: display.displayPhone,
      roleLabel: display.roleLabel,
      inviteDefaults: display.inviteDefaults,
    };
  },
};
