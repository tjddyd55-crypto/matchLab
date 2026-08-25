import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/prisma";
import { requireAssociationOrganizerScope } from "@/lib/permissions";
import {
  assertOrganizerPublicLogoPath,
  createPublicLogoSignedUploadUrl,
} from "@/lib/services/public-partner-upload";

export const organizerPublicLogoService = {
  async getSettings(actor: ActorContext, organizerIdHint?: string | null) {
    const organizerId = await requireAssociationOrganizerScope(actor, organizerIdHint);
    const row = await prisma.organizer.findUnique({
      where: { id: organizerId },
      select: {
        id: true,
        name: true,
        type: true,
        logoPath: true,
        logoUrl: true,
        publicLogoVisible: true,
        websiteUrl: true,
      },
    });
    if (!row) throw new AppError("NOT_FOUND", "주최자를 찾을 수 없습니다.");
    return row;
  },

  async issueLogoUpload(
    actor: ActorContext,
    mimeType: string,
    organizerIdHint?: string | null,
  ) {
    const organizerId = await requireAssociationOrganizerScope(actor, organizerIdHint);
    return createPublicLogoSignedUploadUrl({
      mimeType,
      kind: "organizer-public-logo",
      ownerId: organizerId,
    });
  },

  async update(
    actor: ActorContext,
    input: {
      logoPath?: string;
      logoUrl?: string;
      publicLogoVisible: boolean;
      websiteUrl: string | null;
    },
    organizerIdHint?: string | null,
  ) {
    const organizerId = await requireAssociationOrganizerScope(actor, organizerIdHint);
    if (input.logoPath) {
      assertOrganizerPublicLogoPath(input.logoPath);
      if (!input.logoUrl) {
        throw new AppError("VALIDATION_ERROR", "로고 URL이 필요합니다.");
      }
    }
    return prisma.organizer.update({
      where: { id: organizerId },
      data: {
        ...(input.logoPath && input.logoUrl
          ? { logoPath: input.logoPath, logoUrl: input.logoUrl }
          : {}),
        publicLogoVisible: input.publicLogoVisible,
        websiteUrl: input.websiteUrl?.trim() || null,
      },
      select: {
        id: true,
        logoPath: true,
        logoUrl: true,
        publicLogoVisible: true,
        websiteUrl: true,
      },
    });
  },
};
