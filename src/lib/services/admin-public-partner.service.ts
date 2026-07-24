import "server-only";

import { randomUUID } from "node:crypto";
import type { ActorContext } from "@/lib/auth/actor-context";
import { parseDateOnlyString } from "@/lib/date-only";
import { AppError } from "@/lib/errors/app-error";
import { AuditAction, PublicPartnerType, UserRole } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import {
  computePublicPartnerLogoStatus,
  parsePublicPartnerType,
  PUBLIC_PARTNER_TYPE_VALUES,
} from "@/lib/public-partner-logo";
import {
  assertPublicPartnerLogoPath,
  createPublicLogoSignedUploadUrl,
} from "@/lib/services/public-partner-upload";

export type UpsertPublicPartnerInput = {
  name: string;
  type: PublicPartnerType;
  logoPath: string;
  logoUrl: string;
  websiteUrl?: string | null;
  altText?: string | null;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  openInNewTab?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
};

function parseOptionalDateOnly(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  const d = parseDateOnlyString(value.trim());
  if (!d) {
    throw new AppError("VALIDATION_ERROR", "날짜 형식이 올바르지 않습니다.");
  }
  return d;
}

function assertDateRange(startsAt: Date | null, endsAt: Date | null) {
  if (startsAt && endsAt && startsAt > endsAt) {
    throw new AppError(
      "VALIDATION_ERROR",
      "노출 시작일은 종료일보다 이후일 수 없습니다.",
    );
  }
}

function assertSortOrder(value: number | undefined) {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "정렬 순서는 0 이상의 정수여야 합니다.",
    );
  }
}

function assertWebsiteUrl(url: string | null | undefined) {
  if (!url) return;
  try {
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol)) {
      throw new Error("bad protocol");
    }
  } catch {
    throw new AppError("VALIDATION_ERROR", "웹사이트 URL 형식이 올바르지 않습니다.");
  }
}

export const adminPublicPartnerService = {
  async list(actor: ActorContext) {
    requireRole(actor, [UserRole.admin]);
    const rows = await prisma.publicPartner.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
    return rows.map((row) => ({
      ...row,
      exposureStatus: computePublicPartnerLogoStatus(row),
    }));
  },

  async create(actor: ActorContext, input: UpsertPublicPartnerInput) {
    requireRole(actor, [UserRole.admin]);
    const name = input.name.trim();
    if (!name) throw new AppError("VALIDATION_ERROR", "이름을 입력해 주세요.");
    if (name.length > 120) {
      throw new AppError("VALIDATION_ERROR", "이름은 120자 이하여야 합니다.");
    }
    if (!input.logoPath || !input.logoUrl) {
      throw new AppError("VALIDATION_ERROR", "로고 이미지가 필요합니다.");
    }
    assertPublicPartnerLogoPath(input.logoPath);
    assertSortOrder(input.sortOrder);
    assertWebsiteUrl(input.websiteUrl);
    assertDateRange(input.startsAt ?? null, input.endsAt ?? null);

    const type = PUBLIC_PARTNER_TYPE_VALUES.includes(input.type)
      ? input.type
      : PublicPartnerType.partner;

    const row = await prisma.publicPartner.create({
      data: {
        name,
        type,
        logoPath: input.logoPath,
        logoUrl: input.logoUrl,
        websiteUrl: input.websiteUrl?.trim() || null,
        altText: input.altText?.trim() || null,
        description: input.description?.trim() || null,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
        openInNewTab: input.openInNewTab ?? true,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
        createdByUserId: actor.userId,
        updatedByUserId: actor.userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: actor.userId,
        action: AuditAction.public_partner_changed,
        targetType: "PublicPartner",
        targetId: row.id,
        afterData: { op: "create", name: row.name, type: row.type },
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
        data: {
          deletedAt: new Date(),
          isActive: false,
          updatedByUserId: actor.userId,
        },
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
    if (input.sortOrder !== undefined) assertSortOrder(input.sortOrder);
    if (input.websiteUrl !== undefined) assertWebsiteUrl(input.websiteUrl);
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new AppError("VALIDATION_ERROR", "이름을 입력해 주세요.");
      if (name.length > 120) {
        throw new AppError("VALIDATION_ERROR", "이름은 120자 이하여야 합니다.");
      }
    }

    const startsAt =
      input.startsAt !== undefined
        ? input.startsAt
        : parseOptionalDateOnly(input.startsAtRaw);
    const endsAt =
      input.endsAt !== undefined
        ? input.endsAt
        : parseOptionalDateOnly(input.endsAtRaw);

    const nextStarts =
      startsAt === undefined ? existing.startsAt : startsAt;
    const nextEnds = endsAt === undefined ? existing.endsAt : endsAt;
    assertDateRange(nextStarts, nextEnds);

    const row = await prisma.publicPartner.update({
      where: { id },
      data: {
        name: input.name?.trim() || undefined,
        type: input.type ? parsePublicPartnerType(input.type) : undefined,
        logoPath: input.logoPath || undefined,
        logoUrl: input.logoUrl || undefined,
        websiteUrl:
          input.websiteUrl === undefined
            ? undefined
            : input.websiteUrl?.trim() || null,
        altText:
          input.altText === undefined ? undefined : input.altText?.trim() || null,
        description:
          input.description === undefined
            ? undefined
            : input.description?.trim() || null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        openInNewTab: input.openInNewTab,
        startsAt,
        endsAt,
        updatedByUserId: actor.userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: actor.userId,
        action: AuditAction.public_partner_changed,
        targetType: "PublicPartner",
        targetId: id,
        afterData: {
          op: input.logoPath ? "update_with_logo" : "update",
        },
      },
    });

    return row;
  },

  async reorder(
    actor: ActorContext,
    orderedIds: string[],
  ): Promise<{ ok: true }> {
    requireRole(actor, [UserRole.admin]);
    const unique = [...new Set(orderedIds.map((id) => id.trim()).filter(Boolean))];
    if (unique.length === 0) {
      throw new AppError("VALIDATION_ERROR", "정렬 대상이 없습니다.");
    }

    await prisma.$transaction(
      unique.map((id, index) =>
        prisma.publicPartner.updateMany({
          where: { id, deletedAt: null },
          data: { sortOrder: index, updatedByUserId: actor.userId },
        }),
      ),
    );

    await prisma.auditLog.create({
      data: {
        actorUserId: actor.userId,
        action: AuditAction.public_partner_changed,
        targetType: "PublicPartner",
        targetId: unique[0],
        afterData: { op: "reorder", count: unique.length },
      },
    });

    return { ok: true };
  },

  async moveSortOrder(
    actor: ActorContext,
    id: string,
    direction: "up" | "down",
  ) {
    requireRole(actor, [UserRole.admin]);
    const rows = await prisma.publicPartner.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    const index = rows.findIndex((r) => r.id === id);
    if (index < 0) throw new AppError("NOT_FOUND", "파트너를 찾을 수 없습니다.");
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= rows.length) {
      return { ok: true as const };
    }
    const ordered = rows.map((r) => r.id);
    const tmp = ordered[index]!;
    ordered[index] = ordered[swapWith]!;
    ordered[swapWith] = tmp;
    await this.reorder(actor, ordered);
    return { ok: true as const };
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
