import "server-only";

import { randomUUID } from "node:crypto";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { AuditAction, PublicPartnerType, UserRole } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import {
  assertPublicPartnerLogoPath,
  createPublicLogoSignedUploadUrl,
} from "@/lib/services/public-partner-upload";

export type UpsertPublicPartnerInput = {
  name: string;
  type: "sponsor" | "partner";
  logoPath: string;
  logoUrl: string;
  websiteUrl?: string | null;
  altText?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
};

function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new AppError("VALIDATION_ERROR", "날짜 형식이 올바르지 않습니다.");
  }
  return d;
}

export const adminPublicPartnerService = {
  async list(actor: ActorContext) {
    requireRole(actor, [UserRole.admin]);
    return prisma.publicPartner.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  },

  async create(actor: ActorContext, input: UpsertPublicPartnerInput) {
    requireRole(actor, [UserRole.admin]);
    const name = input.name.trim();
    if (!name) throw new AppError("VALIDATION_ERROR", "이름을 입력해 주세요.");
    if (!input.logoPath || !input.logoUrl) {
      throw new AppError("VALIDATION_ERROR", "로고 이미지가 필요합니다.");
    }
    assertPublicPartnerLogoPath(input.logoPath);

    const row = await prisma.publicPartner.create({
      data: {
        name,
        type:
          input.type === "sponsor"
            ? PublicPartnerType.sponsor
            : PublicPartnerType.partner,
        logoPath: input.logoPath,
        logoUrl: input.logoUrl,
        websiteUrl: input.websiteUrl?.trim() || null,
        altText: input.altText?.trim() || null,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: actor.userId,
        action: AuditAction.public_partner_changed,
        targetType: "PublicPartner",
        targetId: row.id,
        afterData: { op: "create", name: row.name },
      },
    });

    return row;
  },

  async update(
    actor: ActorContext,
    id: string,
    input: Partial<UpsertPublicPartnerInput> & {
      softDelete?: boolean;
      startsAtRaw?: string | null;
      endsAtRaw?: string | null;
    },
  ) {
    requireRole(actor, [UserRole.admin]);
    const existing = await prisma.publicPartner.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new AppError("NOT_FOUND", "파트너를 찾을 수 없습니다.");

    if (input.softDelete) {
      const row = await prisma.publicPartner.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });
      await prisma.auditLog.create({
        data: {
          actorUserId: actor.userId,
          action: AuditAction.public_partner_changed,
          targetType: "PublicPartner",
          targetId: id,
          afterData: { op: "soft_delete" },
        },
      });
      return row;
    }

    if (input.logoPath) assertPublicPartnerLogoPath(input.logoPath);

    const startsAt =
      input.startsAt !== undefined
        ? input.startsAt
        : parseOptionalDate(input.startsAtRaw);
    const endsAt =
      input.endsAt !== undefined
        ? input.endsAt
        : parseOptionalDate(input.endsAtRaw);

    const row = await prisma.publicPartner.update({
      where: { id },
      data: {
        name: input.name?.trim() || undefined,
        type:
          input.type === "sponsor"
            ? PublicPartnerType.sponsor
            : input.type === "partner"
              ? PublicPartnerType.partner
              : undefined,
        logoPath: input.logoPath || undefined,
        logoUrl: input.logoUrl || undefined,
        websiteUrl:
          input.websiteUrl === undefined
            ? undefined
            : input.websiteUrl?.trim() || null,
        altText:
          input.altText === undefined ? undefined : input.altText?.trim() || null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        startsAt,
        endsAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: actor.userId,
        action: AuditAction.public_partner_changed,
        targetType: "PublicPartner",
        targetId: id,
        afterData: { op: "update" },
      },
    });

    return row;
  },

  async issueLogoUpload(actor: ActorContext, mimeType: string, partnerId?: string) {
    requireRole(actor, [UserRole.admin]);
    return createPublicLogoSignedUploadUrl({
      mimeType,
      kind: "public-partner",
      ownerId: partnerId?.trim() || `draft-${randomUUID()}`,
    });
  },
};
