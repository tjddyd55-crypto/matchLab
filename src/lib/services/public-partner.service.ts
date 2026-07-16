import "server-only";

import { OrganizerStatus, OrganizerType, PublicPartnerType } from "@/lib/enums";
import { prisma } from "@/lib/prisma";

export type HomePartnerItem = {
  id: string;
  name: string;
  type: "association" | "sponsor" | "partner";
  logoUrl: string;
  websiteUrl: string | null;
  altText: string;
  sortOrder: number;
};

function inExposureWindow(now: Date, startsAt: Date | null, endsAt: Date | null) {
  if (startsAt && startsAt > now) return false;
  if (endsAt && endsAt < now) return false;
  return true;
}

/**
 * 공개 홈 로고 스트립.
 * MVP 정렬: 협회(이름순) 먼저 → PublicPartner(sortOrder).
 */
export const publicPartnerService = {
  async listHomePartners(): Promise<HomePartnerItem[]> {
    const now = new Date();

    const [associations, partners] = await Promise.all([
      prisma.organizer.findMany({
        where: {
          type: OrganizerType.association,
          status: OrganizerStatus.active,
          publicLogoVisible: true,
          logoUrl: { not: null },
        },
        select: {
          id: true,
          name: true,
          logoUrl: true,
          websiteUrl: true,
          createdAt: true,
        },
        orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      }),
      prisma.publicPartner.findMany({
        where: {
          deletedAt: null,
          isActive: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    const associationItems: HomePartnerItem[] = associations
      .filter((a) => Boolean(a.logoUrl))
      .map((a, index) => ({
        id: `assoc-${a.id}`,
        name: a.name,
        type: "association" as const,
        logoUrl: a.logoUrl!,
        websiteUrl: a.websiteUrl,
        altText: `${a.name} 로고`,
        sortOrder: index,
      }));

    const partnerItems: HomePartnerItem[] = partners
      .filter((p) => inExposureWindow(now, p.startsAt, p.endsAt) && p.logoUrl)
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type === PublicPartnerType.sponsor ? "sponsor" : "partner",
        logoUrl: p.logoUrl,
        websiteUrl: p.websiteUrl,
        altText: p.altText?.trim() || `${p.name} 로고`,
        sortOrder: p.sortOrder,
      }));

    return [...associationItems, ...partnerItems];
  },
};
