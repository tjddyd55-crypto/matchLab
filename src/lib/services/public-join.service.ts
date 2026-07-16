import "server-only";

import { AssociationJoinLinkStatus, OrganizerStatus, OrganizerType } from "@/lib/enums";
import { buildStableMemberGymJoinToken } from "@/lib/member-gym/join-link-url";
import { prisma } from "@/lib/prisma";

export type JoinableAssociationCard = {
  organizerId: string;
  name: string;
  logoUrl: string | null;
  registerPath: string;
};

/**
 * 공개 체육관 가입용 — 활성 협회 + 활성 join link 가 있는 곳만.
 * (로고 필드는 Organizer 공개 로고 schema 적용 후 확장)
 */
export async function listJoinableAssociations(): Promise<
  JoinableAssociationCard[]
> {
  const now = new Date();
  const rows = await prisma.organizer.findMany({
    where: {
      type: OrganizerType.association,
      status: OrganizerStatus.active,
      associationJoinLinks: {
        some: {
          status: AssociationJoinLinkStatus.active,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      },
    },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      associationJoinLinks: {
        where: {
          status: AssociationJoinLinkStatus.active,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return rows
    .map((row) => {
      const link = row.associationJoinLinks[0];
      if (!link) return null;
      return {
        organizerId: row.id,
        name: row.name,
        logoUrl: row.logoUrl,
        registerPath: `/member-gym-register/${buildStableMemberGymJoinToken(link.id)}`,
      };
    })
    .filter((x): x is JoinableAssociationCard => x != null);
}
