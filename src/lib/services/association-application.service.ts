import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  AssociationApplicationAttachmentType,
  AssociationApplicationStatus,
  AuditAction,
  OrganizerStatus,
  OrganizerType,
  UserRole,
} from "@/lib/enums";
import { loginIdToAuthEmail } from "@/lib/fighter-login";
import { memberGymFilesBucket } from "@/lib/member-gym/constants";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loginIdSchema } from "@/lib/validators/login-id.validator";
import { passwordSchema } from "@/lib/validators/password.validator";
import { normalizePostalCode } from "@/lib/postal-address";
import { assertAssociationAttachmentMimeAndSize } from "./association-application-upload.service";

export const ASSOCIATION_OWNER_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashAssociationOwnerInviteToken(token: string): string {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export function buildAssociationOwnerInviteUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return `${base}/association-owner-invite/${token.trim()}`;
}

export type AssociationApplicationAttachmentInput = {
  attachmentType: AssociationApplicationAttachmentType;
  storagePath: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type AssociationApplicationInput = {
  associationName: string;
  associationNameEn?: string;
  representativeName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  website?: string;
  description?: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  attachments?: AssociationApplicationAttachmentInput[];
};

const REQUIRED_ATTACHMENT_TYPES: AssociationApplicationAttachmentType[] = [
  AssociationApplicationAttachmentType.business_registration,
];

function assertAttachmentPaths(
  attachments: AssociationApplicationAttachmentInput[],
) {
  for (const a of attachments) {
    if (!a.storagePath.startsWith("association-applications/")) {
      throw new AppError("FORBIDDEN", "첨부 파일 경로가 올바르지 않습니다.");
    }
    assertAssociationAttachmentMimeAndSize(a);
  }
  for (const required of REQUIRED_ATTACHMENT_TYPES) {
    if (!attachments.some((a) => a.attachmentType === required)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "사업자등록증을 첨부해 주세요.",
      );
    }
  }
}

function requireText(value: string | undefined, label: string): string {
  const v = value?.trim() ?? "";
  if (!v) throw new AppError("VALIDATION_ERROR", `${label}을(를) 입력해 주세요.`);
  return v;
}

export const associationApplicationService = {
  async submit(input: AssociationApplicationInput & {
    signupVerificationToken?: string;
  }) {
    if (!input.termsAccepted || !input.privacyAccepted) {
      throw new AppError(
        "VALIDATION_ERROR",
        "이용약관 및 개인정보 처리에 동의해 주세요.",
      );
    }
    const attachments = input.attachments ?? [];
    assertAttachmentPaths(attachments);
    const bucket = memberGymFilesBucket();

    const { loadMatchonPhoneVerificationConfig } = await import(
      "@/server/phone-verification/config/matchon-phone-verification-config"
    );
    const phoneConfig = loadMatchonPhoneVerificationConfig();
    const contactPhoneRaw = requireText(input.contactPhone, "담당자 연락처");
    let contactPhoneNormalized = contactPhoneRaw;
    if (phoneConfig.signupPhoneVerificationEnabled) {
      const { matchonPhoneVerificationService } = await import(
        "@/server/phone-verification/services/matchon-phone-verification.service"
      );
      const verified = await matchonPhoneVerificationService.consumeSignupToken({
        token: String(input.signupVerificationToken ?? ""),
        phone: contactPhoneRaw,
        accountType: "association",
      });
      contactPhoneNormalized = verified.phoneNormalized;
    } else {
      const { validateKrMobile } = await import("@/lib/phone");
      const phone = validateKrMobile(contactPhoneRaw);
      if (!phone.ok) {
        throw new AppError("VALIDATION_ERROR", phone.message);
      }
      contactPhoneNormalized = phone.normalized;
    }

    return prisma.$transaction(async (tx) => {
      const created = await tx.associationApplication.create({
        data: {
          associationName: requireText(input.associationName, "협회명"),
          associationNameEn: input.associationNameEn?.trim() || null,
          representativeName: requireText(input.representativeName, "대표자명"),
          contactName: requireText(input.contactName, "담당자명"),
          contactPhone: contactPhoneNormalized,
          contactEmail: requireText(input.contactEmail, "담당자 이메일"),
          postalCode: normalizePostalCode(input.postalCode),
          address: input.address?.trim() || null,
          addressDetail: input.addressDetail?.trim() || null,
          website: input.website?.trim() || null,
          description: input.description?.trim() || null,
          status: AssociationApplicationStatus.pending,
          termsAcceptedAt: new Date(),
          privacyAcceptedAt: new Date(),
        },
        select: { id: true, associationName: true, status: true },
      });

      if (attachments.length > 0) {
        await tx.associationApplicationAttachment.createMany({
          data: attachments.map((a) => ({
            applicationId: created.id,
            attachmentType: a.attachmentType,
            storageBucket: bucket,
            storagePath: a.storagePath,
            originalFileName: a.originalFileName.slice(0, 200),
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
          })),
        });
      }

      return created;
    });
  },

  async listForAdmin(actor: ActorContext) {
    requireRole(actor, [UserRole.admin]);
    return prisma.associationApplication.findMany({
      where: { deletedAt: null },
      orderBy: [{ submittedAt: "desc" }],
      select: {
        id: true,
        associationName: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        createdOrganizerId: true,
      },
    });
  },

  async getForAdmin(actor: ActorContext, id: string) {
    requireRole(actor, [UserRole.admin]);
    const row = await prisma.associationApplication.findFirst({
      where: { id, deletedAt: null },
      include: { attachments: { where: { deletedAt: null } } },
    });
    if (!row) throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    return row;
  },

  async reject(actor: ActorContext, id: string, reviewMemo?: string) {
    requireRole(actor, [UserRole.admin]);
    const row = await this.getForAdmin(actor, id);
    if (
      row.status === AssociationApplicationStatus.approved ||
      row.status === AssociationApplicationStatus.rejected
    ) {
      throw new AppError("CONFLICT", "이미 처리된 신청입니다.");
    }
    const updated = await prisma.associationApplication.update({
      where: { id },
      data: {
        status: AssociationApplicationStatus.rejected,
        reviewedAt: new Date(),
        reviewedByUserId: actor.userId,
        reviewMemo: reviewMemo?.trim() || null,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorUserId: actor.userId,
        action: AuditAction.association_application_reviewed,
        targetType: "AssociationApplication",
        targetId: id,
        afterData: { status: "rejected" },
      },
    });
    return updated;
  },

  async approve(
    actor: ActorContext,
    id: string,
    reviewMemo?: string,
  ): Promise<{
    applicationId: string;
    inviteToken: string;
    inviteUrl: string;
    organizerId: string;
  }> {
    requireRole(actor, [UserRole.admin]);
    const row = await this.getForAdmin(actor, id);
    if (row.status === AssociationApplicationStatus.approved) {
      throw new AppError("CONFLICT", "이미 승인된 신청입니다.");
    }
    if (row.status === AssociationApplicationStatus.rejected) {
      throw new AppError("CONFLICT", "반려된 신청은 승인할 수 없습니다.");
    }

    const inviteToken = randomBytes(24).toString("hex");
    const tokenHash = hashAssociationOwnerInviteToken(inviteToken);
    const expiresAt = new Date(Date.now() + ASSOCIATION_OWNER_INVITE_TTL_MS);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: row.contactName,
          email: null,
          phone: row.contactPhone,
          role: UserRole.organizer,
          loginId: null,
          authUserId: null,
        },
      });

      const organizer = await tx.organizer.create({
        data: {
          userId: user.id,
          name: row.associationName,
          type: OrganizerType.association,
          status: OrganizerStatus.active,
          websiteUrl: row.website,
          publicLogoVisible: false,
          // 빈 문자열은 금지하므로, 협회 가입 로고를 Organizer에 승계하지 않습니다.
          logoUrl: null,
          logoPath: null,
        },
      });

      await tx.associationApplication.update({
        where: { id },
        data: {
          status: AssociationApplicationStatus.approved,
          reviewedAt: new Date(),
          reviewedByUserId: actor.userId,
          reviewMemo: reviewMemo?.trim() || null,
          createdOrganizerId: organizer.id,
          ownerInviteTokenHash: tokenHash,
          ownerInviteExpiresAt: expiresAt,
          ownerInviteCreatedAt: new Date(),
          ownerInviteCreatedByUserId: actor.userId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.userId,
          action: AuditAction.association_application_reviewed,
          targetType: "AssociationApplication",
          targetId: id,
          afterData: {
            status: "approved",
            organizerId: organizer.id,
            userId: user.id,
          },
        },
      });

      return { organizerId: organizer.id };
    });

    return {
      applicationId: id,
      inviteToken,
      inviteUrl: buildAssociationOwnerInviteUrl(inviteToken),
      organizerId: result.organizerId,
    };
  },

  async getInviteContextByToken(token: string) {
    const tokenHash = hashAssociationOwnerInviteToken(token);
    const row = await prisma.associationApplication.findFirst({
      where: {
        ownerInviteTokenHash: tokenHash,
        status: AssociationApplicationStatus.approved,
        deletedAt: null,
      },
      include: { createdOrganizer: { include: { user: true } } },
    });
    if (!row?.createdOrganizer?.user) {
      return { ok: false as const, reason: "invalid" as const };
    }
    if (
      row.ownerInviteExpiresAt &&
      row.ownerInviteExpiresAt.getTime() <= Date.now()
    ) {
      return { ok: false as const, reason: "expired" as const };
    }
    const user = row.createdOrganizer.user;
    if (user.loginId && user.authUserId) {
      return { ok: false as const, reason: "already_active" as const };
    }
    return {
      ok: true as const,
      applicationId: row.id,
      associationName: row.associationName,
      contactName: row.contactName,
      contactEmail: row.contactEmail,
      expiresAt: row.ownerInviteExpiresAt!,
    };
  },

  async isLoginIdAvailableForInvite(loginIdRaw: string) {
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
    if (await prisma.user.findFirst({ where: { loginId }, select: { id: true } })) {
      return {
        available: false,
        loginId,
        message: "이미 사용 중인 아이디입니다.\n다른 아이디를 입력해 주세요.",
      };
    }
    const authEmail = loginIdToAuthEmail(loginId);
    if (
      await prisma.user.findFirst({
        where: { email: { equals: authEmail, mode: "insensitive" } },
        select: { id: true },
      })
    ) {
      return {
        available: false,
        loginId,
        message: "이미 사용 중인 아이디입니다.\n다른 아이디를 입력해 주세요.",
      };
    }
    return { available: true, loginId, message: "사용 가능한 아이디입니다." };
  },

  async acceptOwnerInvite(
    token: string,
    input: { loginId: string; password: string; passwordConfirm: string },
  ) {
    const ctx = await this.getInviteContextByToken(token);
    if (!ctx.ok) {
      if (ctx.reason === "already_active") {
        throw new AppError(
          "FORBIDDEN",
          "이미 활성화된 계정입니다.\n로그인 화면에서 설정한 아이디와 비밀번호로 로그인해 주세요.",
        );
      }
      if (ctx.reason === "expired") {
        throw new AppError(
          "FORBIDDEN",
          "계정 생성 링크가 만료되었습니다.\n관리자에게 새 링크를 요청해 주세요.",
        );
      }
      throw new AppError("FORBIDDEN", "유효하지 않은 초대 링크입니다.");
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

    const tokenHash = hashAssociationOwnerInviteToken(token);
    const app = await prisma.associationApplication.findFirst({
      where: { ownerInviteTokenHash: tokenHash },
      include: { createdOrganizer: { include: { user: true } } },
    });
    const user = app?.createdOrganizer?.user;
    if (!app || !user) {
      throw new AppError("FORBIDDEN", "유효하지 않은 초대 링크입니다.");
    }
    if (user.loginId && user.authUserId) {
      await prisma.associationApplication.update({
        where: { id: app.id },
        data: {
          ownerInviteTokenHash: null,
          ownerInviteExpiresAt: null,
        },
      });
      return { loginId: user.loginId, alreadyActive: true as const };
    }

    if (await prisma.user.findFirst({ where: { loginId } })) {
      throw new AppError(
        "CONFLICT",
        "이미 사용 중인 아이디입니다.\n다른 아이디를 입력해 주세요.",
      );
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

    const supabase = createSupabaseAdminClient();
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
    });
    if (error || !created.user) {
      throw new AppError(
        "INTERNAL",
        "인증 계정 생성에 실패했습니다.",
        error?.message,
      );
    }
    const authUserId = created.user.id;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            loginId,
            email: authEmail,
            authUserId,
            mustChangePassword: false,
            passwordIssuedAt: new Date(),
            role: UserRole.organizer,
          },
        });
        await tx.associationApplication.update({
          where: { id: app.id },
          data: {
            ownerInviteTokenHash: null,
            ownerInviteExpiresAt: null,
          },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: AuditAction.association_application_reviewed,
            targetType: "AssociationApplication",
            targetId: app.id,
            afterData: { op: "owner_activated", loginId },
          },
        });
      });
    } catch (e) {
      await supabase.auth.admin.deleteUser(authUserId).catch(() => undefined);
      throw e;
    }

    return { loginId, alreadyActive: false as const };
  },
};
