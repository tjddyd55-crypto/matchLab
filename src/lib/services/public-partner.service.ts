import "server-only";

import { prisma } from "@/lib/prisma";
import {
  isPublicPartnerVisibleOnHome,
  type PublicPartnerExposureStatus,
} from "@/lib/public-partner-logo";
import type { PublicPartnerType } from "@/lib/enums";

export type HomePartnerItem = {
  id: string;
  name: string;
  type: PublicPartnerType;
  logoUrl: string;
  websiteUrl: string | null;
  altText: string;
  openInNewTab: boolean;
  sortOrder: number;
};

/**
 * 공개 홈 하단 파트너 로고.
 * Admin `PublicPartner`만 사용 — Organizer/Association 프로필 로고와 완전 분리.
 */
export const publicPartnerService = {
  async listActivePublicPartnerLogos(
    now: Date = new Date(),
  ): Promise<HomePartnerItem[]> {
    const partners = await prisma.publicPartner.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    });

    return partners
      .filter((p) =>
        isPublicPartnerVisibleOnHome(
          {
            isActive: p.isActive,
            deletedAt: p.deletedAt,
            startsAt: p.startsAt,
            endsAt: p.endsAt,
            logoUrl: p.logoUrl,
          },
          now,
        ),
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        logoUrl: p.logoUrl,
        websiteUrl: p.websiteUrl,
        altText: p.altText?.trim() || `${p.name} 로고`,
        openInNewTab: p.openInNewTab,
        sortOrder: p.sortOrder,
      }));
  },

  /** @deprecated Prefer listActivePublicPartnerLogos */
  async listHomePartners(): Promise<HomePartnerItem[]> {
    return this.listActivePublicPartnerLogos();
  },
};

export type { PublicPartnerExposureStatus };
