import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  AdminPasswordResetAccountType,
  AdminPasswordResetLinkStatus,
  AuditAction,
  OrganizerStatus,
  OrganizerType,
  UserRole,
  GymStatus,
} from "@/lib/enums";
import { isPlaceholderGymOwnerUser } from "@/lib/member-gym/owner-account";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { maskPhoneLoosely } from "@/lib/privacy-display";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { normalizeLoginId } from "@/lib/validators/login-id.validator";
import { completePasswordReset } from "@/server/auth/complete-password-reset";
import { loadMatchonAdminPasswordResetLinkConfig } from "@/server/admin-password-reset/config";
import {
  ADMIN_PASSWORD_RESET_CHALLENGE_COOKIE,
  buildAdminPasswordResetLinkUrl,
  generateAdminPasswordResetToken,
  hashAdminPasswordResetIp,
  hashAdminPasswordResetToken,
  hashAdminPasswordResetUserAgent,
} from "@/server/admin-password-reset/token";

export type AdminPasswordResetTargetAccount = {
  userId: string;
  authUserId: string;
  loginId: string;
  name: string;
  emailMasked: string | null;
  phoneMasked: string | null;
  accountType: AdminPasswordResetAccountType;
  accountLabel: string;
  representativeName: string | null;
  organizerId: string | null;
  gymId: string | null;
  accountStatus: string;
  activeLink: {
    id: string;
    expiresAt: string;
    createdAt: string;
  } | null;
  lastIssuedAt: string | null;
};

export type AdminPasswordResetPageStatus =
  | "valid"
  | "invalid"
  | "expired"
  | "consumed"
  | "revoked";

type IssueRateBucket = { at: number[] };
const issueByAdmin = new Map<string, IssueRateBucket>();
const issueByTarget = new Map<string, IssueRateBucket>();

function assertFeatureEnabled() {
  const config = loadMatchonAdminPasswordResetLinkConfig();
  if (!config.enabled) {
    throw new AppError(
      "FORBIDDEN",
      "관리자 비밀번호 재설정 링크 기능이 비활성입니다.",
    );
  }
  return config;
}

function requirePlatformAdmin(actor: ActorContext) {
  requireRole(actor, [UserRole.admin]);
}

function maskEmail(email: string | null | undefined): string | null {
  const e = email?.trim();
  if (!e) return null;
  const [local, domain] = e.split("@");
  if (!domain) return "***";
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}***@${domain}`;
}

function maskLoginId(loginId: string): string {
  if (loginId.length <= 2) return "***";
  if (loginId.length <= 5) {
    return `${loginId.slice(0, 1)}${"*".repeat(loginId.length - 1)}`;
  }
  return `${loginId.slice(0, 3)}${"*".repeat(Math.min(3, loginId.length - 5))}${loginId.slice(-2)}`;
}

function pruneBucket(bucket: IssueRateBucket, windowMs: number) {
  const cutoff = Date.now() - windowMs;
  bucket.at = bucket.at.filter((t) => t >= cutoff);
}

function assertIssueRateLimits(input: {
  adminUserId: string;
  targetUserId: string;
  maxPerAdmin: number;
  maxPerTarget: number;
  reissueMinIntervalMs: number;
}) {
  const windowMs = 60 * 60_000;
  const admin = issueByAdmin.get(input.adminUserId) ?? { at: [] };
  const target = issueByTarget.get(input.targetUserId) ?? { at: [] };
  pruneBucket(admin, windowMs);
  pruneBucket(target, windowMs);

  const lastTarget = target.at[target.at.length - 1];
  if (
    lastTarget != null &&
    Date.now() - lastTarget < input.reissueMinIntervalMs
  ) {
    throw new AppError(
      "FORBIDDEN",
      "잠시 후 다시 발급해 주세요.",
    );
  }
  if (admin.at.length >= input.maxPerAdmin) {
    throw new AppError("FORBIDDEN", "발급 한도를 초과했습니다.");
  }
  if (target.at.length >= input.maxPerTarget) {
    throw new AppError("FORBIDDEN", "해당 계정 발급 한도를 초과했습니다.");
  }

  admin.at.push(Date.now());
  target.at.push(Date.now());
  issueByAdmin.set(input.adminUserId, admin);
  issueByTarget.set(input.targetUserId, target);
}

async function resolveEligibleTargetByLoginId(
  loginIdRaw: string,
): Promise<AdminPasswordResetTargetAccount> {
  const loginId = normalizeLoginId(loginIdRaw);
  if (!loginId) {
    throw new AppError("VALIDATION_ERROR", "로그인 아이디를 입력해 주세요.");
  }

  const users = await prisma.user.findMany({
    where: { loginId },
    select: {
      id: true,
      authUserId: true,
      loginId: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      passwordResetAt: true,
      organizer: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
        },
      },
      ownedGym: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
    take: 5,
  });

  if (users.length === 0) {
    throw new AppError("NOT_FOUND", "대상 계정을 찾을 수 없습니다.");
  }
  if (users.length > 1) {
    throw new AppError(
      "CONFLICT",
      "계정이 여러 건 매칭됩니다. 관리자에게 문의해 주세요.",
    );
  }

  const user = users[0]!;
  if (!user.authUserId || !user.loginId) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Auth가 연결되지 않은 계정입니다. 계정 활성화를 먼저 완료해 주세요.",
    );
  }
  if (isPlaceholderGymOwnerUser(user)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "아직 활성화되지 않은 계정입니다.",
    );
  }

  let accountType: AdminPasswordResetAccountType | null = null;
  let accountLabel = "";
  const representativeName: string | null = user.name;
  let organizerId: string | null = null;
  let gymId: string | null = null;
  let accountStatus = "unknown";

  if (
    user.role === UserRole.organizer &&
    user.organizer?.type === OrganizerType.association
  ) {
    accountType = AdminPasswordResetAccountType.association;
    accountLabel = user.organizer.name;
    organizerId = user.organizer.id;
    accountStatus = user.organizer.status;
    if (user.organizer.status === OrganizerStatus.suspended || user.organizer.status === OrganizerStatus.archived) {
      throw new AppError("FORBIDDEN", "정지되었거나 보관된 협회 계정입니다.");
    }
  } else if (user.role === UserRole.gym && user.ownedGym) {
    accountType = AdminPasswordResetAccountType.gym;
    accountLabel = user.ownedGym.name;
    gymId = user.ownedGym.id;
    accountStatus = user.ownedGym.status;
    if (
      user.ownedGym.status === GymStatus.suspended ||
      user.ownedGym.status === GymStatus.archived
    ) {
      throw new AppError("FORBIDDEN", "정지되었거나 보관된 체육관 계정입니다.");
    }
  }

  if (!accountType) {
    throw new AppError(
      "FORBIDDEN",
      "협회 대표 또는 체육관 owner 계정만 대상입니다.",
    );
  }

  const active = await prisma.adminPasswordResetLink.findFirst({
    where: {
      userId: user.id,
      status: AdminPasswordResetLinkStatus.active,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, expiresAt: true, createdAt: true },
  });

  const lastIssued = await prisma.adminPasswordResetLink.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return {
    userId: user.id,
    authUserId: user.authUserId,
    loginId: user.loginId,
    name: user.name,
    emailMasked: maskEmail(user.email),
    phoneMasked: user.phone ? maskPhoneLoosely(user.phone) : null,
    accountType,
    accountLabel,
    representativeName,
    organizerId,
    gymId,
    accountStatus,
    activeLink: active
      ? {
          id: active.id,
          expiresAt: active.expiresAt.toISOString(),
          createdAt: active.createdAt.toISOString(),
        }
      : null,
    lastIssuedAt: lastIssued?.createdAt.toISOString() ?? null,
  };
}

function classifyLinkStatus(row: {
  status: AdminPasswordResetLinkStatus;
  expiresAt: Date;
}): AdminPasswordResetPageStatus {
  if (row.status === AdminPasswordResetLinkStatus.revoked) return "revoked";
  if (row.status === AdminPasswordResetLinkStatus.consumed) return "consumed";
  if (
    row.status === AdminPasswordResetLinkStatus.expired ||
    row.expiresAt.getTime() < Date.now()
  ) {
    return "expired";
  }
  if (row.status === AdminPasswordResetLinkStatus.active) return "valid";
  return "invalid";
}

export const adminPasswordResetLinkService = {
  async resolveTargetForAdmin(
    actor: ActorContext,
    loginId: string,
  ): Promise<AdminPasswordResetTargetAccount> {
    requirePlatformAdmin(actor);
    assertFeatureEnabled();
    return resolveEligibleTargetByLoginId(loginId);
  },

  async resolveTargetForAdminByUserId(
    actor: ActorContext,
    userId: string,
  ): Promise<AdminPasswordResetTargetAccount> {
    requirePlatformAdmin(actor);
    assertFeatureEnabled();
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { loginId: true },
    });
    if (!user?.loginId) {
      throw new AppError("NOT_FOUND", "대상 계정을 찾을 수 없습니다.");
    }
    return resolveEligibleTargetByLoginId(user.loginId);
  },

  async issueLink(
    actor: ActorContext,
    input: { loginId?: string; userId?: string; inquiryId?: string | null },
  ): Promise<{
    resetUrl: string;
    expiresAt: string;
    linkId: string;
    loginId: string;
    accountLabel: string;
    accountType: AdminPasswordResetAccountType;
  }> {
    requirePlatformAdmin(actor);
    const config = assertFeatureEnabled();
    const target = input.userId
      ? await this.resolveTargetForAdminByUserId(actor, input.userId)
      : await resolveEligibleTargetByLoginId(input.loginId ?? "");

    assertIssueRateLimits({
      adminUserId: actor.userId,
      targetUserId: target.userId,
      maxPerAdmin: config.maxIssuesPerAdminPerHour,
      maxPerTarget: config.maxIssuesPerTargetPerHour,
      reissueMinIntervalMs: config.reissueMinIntervalMs,
    });

    let inquiryId: string | null = null;
    if (input.inquiryId?.trim()) {
      const inquiry = await prisma.desktopSupportInquiry.findFirst({
        where: { id: input.inquiryId.trim(), deletedAt: null },
        select: { id: true },
      });
      if (!inquiry) {
        throw new AppError("NOT_FOUND", "문의글을 찾을 수 없습니다.");
      }
      inquiryId = inquiry.id;
    }

    const rawToken = generateAdminPasswordResetToken();
    const tokenHash = hashAdminPasswordResetToken(rawToken);
    const expiresAt = new Date(Date.now() + config.ttlMs);

    const created = await prisma.$transaction(async (tx) => {
      await tx.adminPasswordResetLink.updateMany({
        where: {
          userId: target.userId,
          status: AdminPasswordResetLinkStatus.active,
        },
        data: {
          status: AdminPasswordResetLinkStatus.revoked,
          revokedAt: new Date(),
          revokedByUserId: actor.userId,
        },
      });

      const row = await tx.adminPasswordResetLink.create({
        data: {
          userId: target.userId,
          authUserId: target.authUserId,
          accountType: target.accountType,
          organizerId: target.organizerId,
          gymId: target.gymId,
          tokenHash,
          status: AdminPasswordResetLinkStatus.active,
          expiresAt,
          issuedByUserId: actor.userId,
          inquiryId,
        },
        select: { id: true },
      });

      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.admin_password_reset_link_issued,
          targetType: "User",
          targetId: target.userId,
          afterData: {
            linkId: row.id,
            accountType: target.accountType,
            organizerId: target.organizerId,
            gymId: target.gymId,
            inquiryId,
            expiresAt: expiresAt.toISOString(),
          },
        },
        tx,
      );

      if (inquiryId) {
        const noteLine = `[${new Date().toISOString()}] 재설정 링크 발급됨 (linkId=${row.id})`;
        const existing = await tx.desktopSupportInquiry.findFirst({
          where: { id: inquiryId },
          select: { adminNote: true },
        });
        const nextNote = existing?.adminNote
          ? `${existing.adminNote}\n${noteLine}`
          : noteLine;
        await tx.desktopSupportInquiry.update({
          where: { id: inquiryId },
          data: { adminNote: nextNote },
        });
      }

      return row;
    });

    return {
      resetUrl: buildAdminPasswordResetLinkUrl(rawToken),
      expiresAt: expiresAt.toISOString(),
      linkId: created.id,
      loginId: target.loginId,
      accountLabel: target.accountLabel,
      accountType: target.accountType,
    };
  },

  async revokeActiveLink(
    actor: ActorContext,
    input: { linkId: string },
  ): Promise<{ ok: true }> {
    requirePlatformAdmin(actor);
    assertFeatureEnabled();

    const row = await prisma.adminPasswordResetLink.findFirst({
      where: { id: input.linkId },
      select: {
        id: true,
        userId: true,
        status: true,
        expiresAt: true,
        accountType: true,
        organizerId: true,
        gymId: true,
        inquiryId: true,
      },
    });
    if (!row) throw new AppError("NOT_FOUND", "링크를 찾을 수 없습니다.");

    if (row.status !== AdminPasswordResetLinkStatus.active) {
      throw new AppError("CONFLICT", "취소할 수 없는 상태입니다.");
    }
    if (row.expiresAt.getTime() < Date.now()) {
      await prisma.adminPasswordResetLink.update({
        where: { id: row.id },
        data: { status: AdminPasswordResetLinkStatus.expired },
      });
      throw new AppError("CONFLICT", "이미 만료된 링크입니다.");
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.adminPasswordResetLink.updateMany({
        where: {
          id: row.id,
          status: AdminPasswordResetLinkStatus.active,
        },
        data: {
          status: AdminPasswordResetLinkStatus.revoked,
          revokedAt: new Date(),
          revokedByUserId: actor.userId,
          challengeTokenHash: null,
          challengeExpiresAt: null,
        },
      });
      if (updated.count !== 1) {
        throw new AppError("CONFLICT", "취소할 수 없는 상태입니다.");
      }
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.admin_password_reset_link_revoked,
          targetType: "User",
          targetId: row.userId,
          afterData: {
            linkId: row.id,
            accountType: row.accountType,
            organizerId: row.organizerId,
            gymId: row.gymId,
            inquiryId: row.inquiryId,
          },
        },
        tx,
      );
    });

    return { ok: true as const };
  },

  async listRecentForTarget(
    actor: ActorContext,
    userId: string,
  ): Promise<
    Array<{
      id: string;
      status: AdminPasswordResetLinkStatus;
      expiresAt: string;
      createdAt: string;
      consumedAt: string | null;
      revokedAt: string | null;
      issuedByUserId: string;
    }>
  > {
    requirePlatformAdmin(actor);
    assertFeatureEnabled();
    const rows = await prisma.adminPasswordResetLink.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        consumedAt: true,
        revokedAt: true,
        issuedByUserId: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      expiresAt: r.expiresAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      consumedAt: r.consumedAt?.toISOString() ?? null,
      revokedAt: r.revokedAt?.toISOString() ?? null,
      issuedByUserId: r.issuedByUserId,
    }));
  },

  /**
   * URL token → HttpOnly challenge 교환.
   * 원본 token은 반환하지 않는다.
   */
  async exchangeTokenForChallenge(input: {
    rawToken: string;
  }): Promise<{
    status: AdminPasswordResetPageStatus;
    challengeToken: string | null;
    challengeExpiresAt: string | null;
    loginIdMasked: string;
    accountTypeLabel: string;
  }> {
    const config = assertFeatureEnabled();
    const tokenHash = hashAdminPasswordResetToken(input.rawToken);
    const row = await prisma.adminPasswordResetLink.findFirst({
      where: { tokenHash },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        accountType: true,
        user: { select: { loginId: true } },
      },
    });

    if (!row) {
      return {
        status: "invalid",
        challengeToken: null,
        challengeExpiresAt: null,
        loginIdMasked: "",
        accountTypeLabel: "",
      };
    }

    const status = classifyLinkStatus(row);
    if (status !== "valid") {
      if (
        status === "expired" &&
        row.status === AdminPasswordResetLinkStatus.active
      ) {
        await prisma.adminPasswordResetLink.updateMany({
          where: {
            id: row.id,
            status: AdminPasswordResetLinkStatus.active,
          },
          data: { status: AdminPasswordResetLinkStatus.expired },
        });
      }
      return {
        status,
        challengeToken: null,
        challengeExpiresAt: null,
        loginIdMasked: "",
        accountTypeLabel: "",
      };
    }

    const challengeRaw = generateAdminPasswordResetToken();
    const challengeHash = hashAdminPasswordResetToken(challengeRaw);
    const challengeExpiresAt = new Date(
      Date.now() + config.challengeTtlMs,
    );

    await prisma.adminPasswordResetLink.update({
      where: { id: row.id },
      data: {
        challengeTokenHash: challengeHash,
        challengeExpiresAt,
      },
    });

    return {
      status: "valid",
      challengeToken: challengeRaw,
      challengeExpiresAt: challengeExpiresAt.toISOString(),
      loginIdMasked: maskLoginId(row.user.loginId ?? ""),
      accountTypeLabel:
        row.accountType === AdminPasswordResetAccountType.association
          ? "협회"
          : "체육관",
    };
  },

  async getPageByChallenge(challengeRaw: string): Promise<{
    status: AdminPasswordResetPageStatus;
    loginIdMasked: string;
    accountTypeLabel: string;
  }> {
    assertFeatureEnabled();
    if (!challengeRaw.trim()) {
      return { status: "invalid", loginIdMasked: "", accountTypeLabel: "" };
    }
    const challengeHash = hashAdminPasswordResetToken(challengeRaw);
    const row = await prisma.adminPasswordResetLink.findFirst({
      where: { challengeTokenHash: challengeHash },
      select: {
        status: true,
        expiresAt: true,
        challengeExpiresAt: true,
        accountType: true,
        user: { select: { loginId: true } },
      },
    });
    if (!row) {
      return { status: "invalid", loginIdMasked: "", accountTypeLabel: "" };
    }
    if (
      !row.challengeExpiresAt ||
      row.challengeExpiresAt.getTime() < Date.now()
    ) {
      return { status: "expired", loginIdMasked: "", accountTypeLabel: "" };
    }
    const status = classifyLinkStatus(row);
    if (status !== "valid") {
      return { status, loginIdMasked: "", accountTypeLabel: "" };
    }
    return {
      status: "valid",
      loginIdMasked: maskLoginId(row.user.loginId ?? ""),
      accountTypeLabel:
        row.accountType === AdminPasswordResetAccountType.association
          ? "협회"
          : "체육관",
    };
  },

  async completeWithChallenge(input: {
    challengeToken: string;
    newPassword: string;
    confirmPassword: string;
    requestIp?: string | null;
    userAgent?: string | null;
  }): Promise<{ ok: true }> {
    assertFeatureEnabled();
    if (input.newPassword !== input.confirmPassword) {
      throw new AppError(
        "VALIDATION_ERROR",
        "비밀번호 확인이 일치하지 않습니다.",
      );
    }

    const challengeHash = hashAdminPasswordResetToken(input.challengeToken);
    const row = await prisma.adminPasswordResetLink.findFirst({
      where: { challengeTokenHash: challengeHash },
      select: {
        id: true,
        userId: true,
        authUserId: true,
        status: true,
        expiresAt: true,
        challengeExpiresAt: true,
        accountType: true,
        organizerId: true,
        gymId: true,
        inquiryId: true,
      },
    });

    if (!row) {
      throw new AppError("FORBIDDEN", "사용할 수 없는 링크입니다.");
    }

    const status = classifyLinkStatus(row);
    if (status === "expired") {
      throw new AppError("FORBIDDEN", "재설정 링크가 만료되었습니다.");
    }
    if (status === "consumed") {
      throw new AppError("FORBIDDEN", "이미 사용된 재설정 링크입니다.");
    }
    if (status === "revoked") {
      throw new AppError("FORBIDDEN", "취소된 재설정 링크입니다.");
    }
    if (status !== "valid") {
      throw new AppError("FORBIDDEN", "사용할 수 없는 링크입니다.");
    }
    if (
      !row.challengeExpiresAt ||
      row.challengeExpiresAt.getTime() < Date.now()
    ) {
      throw new AppError("FORBIDDEN", "재설정 세션이 만료되었습니다.");
    }

    try {
      await completePasswordReset({
        userId: row.userId,
        authUserId: row.authUserId,
        newPassword: input.newPassword,
        resetMethod: "admin_reset_link",
        credentialId: row.id,
        auditAction: AuditAction.password_reset_by_admin_link_completed,
        auditAfterData: {
          accountType: row.accountType,
          organizerId: row.organizerId,
          gymId: row.gymId,
          inquiryId: row.inquiryId,
        },
        consumeCredential: async () => {
          const consumed = await prisma.adminPasswordResetLink.updateMany({
            where: {
              id: row.id,
              status: AdminPasswordResetLinkStatus.active,
            },
            data: {
              status: AdminPasswordResetLinkStatus.consumed,
              consumedAt: new Date(),
              challengeTokenHash: null,
              challengeExpiresAt: null,
              consumedIpHash: hashAdminPasswordResetIp(input.requestIp),
              consumedUserAgentHash: hashAdminPasswordResetUserAgent(
                input.userAgent,
              ),
            },
          });
          if (consumed.count !== 1) {
            throw new AppError("CONFLICT", "이미 사용된 재설정 링크입니다.");
          }

          if (row.inquiryId) {
            const noteLine = `[${new Date().toISOString()}] 비밀번호 변경 완료 (linkId=${row.id})`;
            const inquiry = await prisma.desktopSupportInquiry.findFirst({
              where: { id: row.inquiryId },
              select: { adminNote: true },
            });
            if (inquiry) {
              const nextNote = inquiry.adminNote
                ? `${inquiry.adminNote}\n${noteLine}`
                : noteLine;
              await prisma.desktopSupportInquiry.update({
                where: { id: row.inquiryId },
                data: { adminNote: nextNote },
              });
            }
          }
        },
      });
    } catch (e) {
      await auditRepository.createAuditLog({
        actorUserId: row.userId,
        action: AuditAction.admin_password_reset_link_failed,
        targetType: "AdminPasswordResetLink",
        targetId: row.id,
        afterData: {
          code: e instanceof AppError ? e.code : "INTERNAL",
        },
      }).catch(() => undefined);
      throw e;
    }

    return { ok: true as const };
  },

  cookieName: ADMIN_PASSWORD_RESET_CHALLENGE_COOKIE,
};
