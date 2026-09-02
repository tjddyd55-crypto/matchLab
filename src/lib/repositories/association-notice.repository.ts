import "server-only";

import type { Prisma } from "@/generated/prisma";
import { AssociationMemberGymStatus } from "@/lib/enums";
import { prisma } from "@/lib/prisma";

const noticeListOrder = [
  { isPinned: "desc" as const },
  { publishedAt: "desc" as const },
  { createdAt: "desc" as const },
];

export type AssociationNoticeListRow = {
  id: string;
  organizerId: string;
  title: string;
  isPinned: boolean;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const associationNoticeRepository = {
  async listByOrganizerId(organizerId: string): Promise<AssociationNoticeListRow[]> {
    return prisma.associationNotice.findMany({
      where: { organizerId, deletedAt: null },
      orderBy: noticeListOrder,
      select: {
        id: true,
        organizerId: true,
        title: true,
        isPinned: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async findByIdForOrganizer(organizerId: string, noticeId: string) {
    return prisma.associationNotice.findFirst({
      where: { id: noticeId, organizerId, deletedAt: null },
    });
  },

  async create(input: {
    organizerId: string;
    title: string;
    content: string;
    isPinned: boolean;
    createdByUserId: string;
    relatedFormId?: string | null;
  }) {
    return prisma.associationNotice.create({
      data: {
        organizerId: input.organizerId,
        title: input.title,
        content: input.content,
        isPinned: input.isPinned,
        createdByUserId: input.createdByUserId,
        relatedFormId: input.relatedFormId ?? null,
        publishedAt: new Date(),
      },
    });
  },

  async update(
    noticeId: string,
    data: {
      title: string;
      content: string;
      isPinned: boolean;
      relatedFormId?: string | null;
    },
  ) {
    return prisma.associationNotice.update({
      where: { id: noticeId },
      data: {
        title: data.title,
        content: data.content,
        isPinned: data.isPinned,
        relatedFormId: data.relatedFormId ?? null,
      },
    });
  },

  async softDelete(noticeId: string) {
    return prisma.associationNotice.update({
      where: { id: noticeId },
      data: { deletedAt: new Date() },
    });
  },

  /** Sidebar용 — active 회원 관계의 협회 id/name만 */
  async listActiveAssociationsForGym(gymId: string) {
    return prisma.associationMemberGym.findMany({
      where: {
        gymId,
        status: AssociationMemberGymStatus.active,
        organizer: { type: "association" },
      },
      orderBy: { joinedAt: "asc" },
      select: {
        organizerId: true,
        organizer: { select: { id: true, name: true } },
      },
    });
  },

  async findActiveMembership(gymId: string, organizerId: string) {
    return prisma.associationMemberGym.findFirst({
      where: {
        gymId,
        organizerId,
        status: AssociationMemberGymStatus.active,
        organizer: { type: "association" },
      },
      select: {
        id: true,
        organizerId: true,
        organizer: { select: { id: true, name: true } },
      },
    });
  },

  async findPublishedNoticeForGym(input: {
    gymId: string;
    organizerId: string;
    noticeId: string;
  }) {
    const membership = await this.findActiveMembership(
      input.gymId,
      input.organizerId,
    );
    if (!membership) return null;

    const notice = await prisma.associationNotice.findFirst({
      where: {
        id: input.noticeId,
        organizerId: input.organizerId,
        deletedAt: null,
      },
    });
    if (!notice) return null;

    return {
      notice,
      association: membership.organizer,
    };
  },
};

export type AssociationNoticeCreateData = Prisma.AssociationNoticeCreateInput;
