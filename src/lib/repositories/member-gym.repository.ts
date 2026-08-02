/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import {
  AssociationJoinLinkStatus,
  AssociationMemberGymApplicationStatus,
  AssociationMemberGymStatus,
  GymStatus,
} from "@/generated/prisma";
import { pickMembershipForPortalGate } from "@/lib/member-gym/portal-membership-gate";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export type MemberGymApplicationListFilters = {
  organizerId: string;
  status?: AssociationMemberGymApplicationStatus;
  q?: string;
  /** online = public_link(+레거시 joinLink), manual = 직접 접수 계열 */
  sourceGroup?: "online" | "manual";
};

export type MemberGymListFilters = {
  organizerId: string;
  status?: AssociationMemberGymStatus;
  q?: string;
};

export const memberGymRepository = {
  async getOrCreateSettings(organizerId: string, tx?: Prisma.TransactionClient) {
    const client = db(tx);
    const existing = await client.associationMemberGymSettings.findUnique({
      where: { organizerId },
    });
    if (existing) return existing;
    return client.associationMemberGymSettings.create({
      data: { organizerId, settingsJson: {} },
    });
  },

  async updateSettings(
    organizerId: string,
    settingsJson: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).associationMemberGymSettings.upsert({
      where: { organizerId },
      create: { organizerId, settingsJson },
      update: { settingsJson },
    });
  },

  async createJoinLink(
    data: {
      organizerId: string;
      label: string;
      tokenHash: string;
      expiresAt: Date | null;
      maxUses: number | null;
      allowDuplicateApplication: boolean;
      createdByUserId: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).associationJoinLink.create({ data });
  },

  async listJoinLinks(organizerId: string) {
    return prisma.associationJoinLink.findMany({
      where: { organizerId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { applications: true, attachments: true } },
      },
    });
  },

  async findJoinLinkById(organizerId: string, linkId: string) {
    return prisma.associationJoinLink.findFirst({
      where: { id: linkId, organizerId },
      include: {
        attachments: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  },

  async findJoinLinkByTokenHash(tokenHash: string) {
    return prisma.associationJoinLink.findUnique({
      where: { tokenHash },
      include: {
        organizer: { select: { id: true, name: true, type: true } },
        attachments: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  },

  /** 공개 안정 URL(HMAC) 해석용 — organizer scope 없이 id로 조회 */
  async findJoinLinkByPublicId(linkId: string) {
    return prisma.associationJoinLink.findUnique({
      where: { id: linkId },
      include: {
        organizer: { select: { id: true, name: true, type: true } },
        attachments: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  },

  async listActiveJoinLinks(organizerId: string) {
    return prisma.associationJoinLink.findMany({
      where: {
        organizerId,
        status: AssociationJoinLinkStatus.active,
        revokedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        label: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
        createdAt: true,
      },
    });
  },

  async updateJoinLink(
    linkId: string,
    data: Prisma.AssociationJoinLinkUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).associationJoinLink.update({ where: { id: linkId }, data });
  },

  async createJoinLinkAttachment(
    data: Prisma.AssociationJoinLinkAttachmentCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).associationJoinLinkAttachment.create({ data });
  },

  async softDeleteJoinLinkAttachment(
    organizerId: string,
    attachmentId: string,
  ) {
    const row = await prisma.associationJoinLinkAttachment.findFirst({
      where: {
        id: attachmentId,
        deletedAt: null,
        joinLink: { organizerId },
      },
    });
    if (!row) return null;
    return prisma.associationJoinLinkAttachment.update({
      where: { id: attachmentId },
      data: { deletedAt: new Date() },
    });
  },

  async findJoinLinkAttachmentById(attachmentId: string) {
    return prisma.associationJoinLinkAttachment.findFirst({
      where: { id: attachmentId, deletedAt: null },
      include: {
        joinLink: {
          select: {
            id: true,
            organizerId: true,
            tokenHash: true,
            status: true,
            expiresAt: true,
            maxUses: true,
            usedCount: true,
            revokedAt: true,
          },
        },
      },
    });
  },

  async createApplication(
    data: Prisma.AssociationMemberGymApplicationCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).associationMemberGymApplication.create({ data });
  },

  async createApplicationAttachments(
    rows: Prisma.AssociationMemberGymApplicationAttachmentCreateManyInput[],
    tx?: Prisma.TransactionClient,
  ) {
    if (rows.length === 0) return;
    await db(tx).associationMemberGymApplicationAttachment.createMany({
      data: rows,
    });
  },

  async listApplications(filters: MemberGymApplicationListFilters) {
    const and: Prisma.AssociationMemberGymApplicationWhereInput[] = [
      { organizerId: filters.organizerId },
    ];
    if (filters.status) and.push({ status: filters.status });
    if (filters.sourceGroup === "online") {
      and.push({
        OR: [
          { submissionSource: "public_link" },
          { submissionSource: null, joinLinkId: { not: null } },
        ],
      });
    } else if (filters.sourceGroup === "manual") {
      and.push({
        OR: [
          {
            submissionSource: {
              in: ["manual", "paper", "visit", "phone", "email"],
            },
          },
          { submissionSource: null, joinLinkId: null },
        ],
      });
    }
    const q = filters.q?.trim();
    if (q) {
      and.push({
        OR: [
          { gymName: { contains: q, mode: "insensitive" } },
          { ownerName: { contains: q, mode: "insensitive" } },
          { contactName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      });
    }
    return prisma.associationMemberGymApplication.findMany({
      where: { AND: and },
      orderBy: { submittedAt: "desc" },
      include: {
        _count: { select: { attachments: true } },
      },
    });
  },

  async countApplicationsByStatus(organizerId: string) {
    const rows = await prisma.associationMemberGymApplication.groupBy({
      by: ["status"],
      where: { organizerId },
      _count: { _all: true },
    });
    return rows;
  },

  async findApplicationById(organizerId: string, applicationId: string) {
    return prisma.associationMemberGymApplication.findFirst({
      where: { id: applicationId, organizerId },
      include: {
        attachments: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
        },
        reviews: { orderBy: { createdAt: "desc" } },
        memberGym: true,
        linkedGym: { select: { id: true, name: true, phone: true, address: true } },
      },
    });
  },

  async findApplicationAttachment(
    organizerId: string,
    attachmentId: string,
  ) {
    return prisma.associationMemberGymApplicationAttachment.findFirst({
      where: {
        id: attachmentId,
        deletedAt: null,
        application: { organizerId },
      },
    });
  },

  async createReview(
    data: {
      applicationId: string;
      fromStatus: AssociationMemberGymApplicationStatus | null;
      toStatus: AssociationMemberGymApplicationStatus;
      note?: string | null;
      actorUserId?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).associationMemberGymApplicationReview.create({
      data: {
        applicationId: data.applicationId,
        fromStatus: data.fromStatus ?? undefined,
        toStatus: data.toStatus,
        note: data.note ?? undefined,
        actorUserId: data.actorUserId ?? undefined,
      },
    });
  },

  async updateApplication(
    applicationId: string,
    data: Prisma.AssociationMemberGymApplicationUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).associationMemberGymApplication.update({
      where: { id: applicationId },
      data,
    });
  },

  async listMemberGyms(filters: MemberGymListFilters) {
    const where: Prisma.AssociationMemberGymWhereInput = {
      organizerId: filters.organizerId,
    };
    if (filters.status) where.status = filters.status;
    const q = filters.q?.trim();
    if (q) {
      where.OR = [
        { memberCode: { contains: q, mode: "insensitive" } },
        { gym: { name: { contains: q, mode: "insensitive" } } },
        { gym: { phone: { contains: q, mode: "insensitive" } } },
      ];
    }
    return prisma.associationMemberGym.findMany({
      where,
      orderBy: { joinedAt: "desc" },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            status: true,
            ownerUserId: true,
            ownerUser: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                loginId: true,
                role: true,
                authUserId: true,
              },
            },
            fighters: {
              where: { status: "active" },
              select: { id: true },
            },
            _count: {
              select: {
                fighters: true,
              },
            },
          },
        },
      },
    });
  },

  async countMemberGymsByStatus(organizerId: string) {
    return prisma.associationMemberGym.groupBy({
      by: ["status"],
      where: { organizerId },
      _count: { _all: true },
    });
  },

  async findMemberGymById(organizerId: string, memberGymId: string) {
    return prisma.associationMemberGym.findFirst({
      where: { id: memberGymId, organizerId },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            status: true,
            ownerUserId: true,
            ownerUser: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                loginId: true,
                role: true,
                authUserId: true,
                createdAt: true,
              },
            },
            fighters: {
              select: {
                id: true,
                name: true,
                gender: true,
                birthDate: true,
                weight: true,
                status: true,
                createdAt: true,
                updatedAt: true,
              },
              orderBy: { createdAt: "desc" },
            },
            _count: { select: { fighters: true } },
          },
        },
        application: {
          include: {
            attachments: {
              where: { deletedAt: null },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });
  },

  async findMemberGymByOrganizerGym(
    organizerId: string,
    gymId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).associationMemberGym.findUnique({
      where: { organizerId_gymId: { organizerId, gymId } },
    });
  },

  /**
   * 포털 게이트용 membership 선택.
   * - withdrawn만 있으면 null (독립 체육관)
   * - 복수 협회면 접근 가능한 연결을 우선 (다른 협회 해제가 포털을 잠그지 않음)
   */
  async findMemberGymByGymId(gymId: string) {
    const rows = await prisma.associationMemberGym.findMany({
      where: { gymId },
      orderBy: { updatedAt: "desc" },
    });
    return pickMembershipForPortalGate(rows);
  },

  async findMemberGymByOwnerInviteTokenHash(tokenHash: string) {
    return prisma.associationMemberGym.findFirst({
      where: {
        ownerInviteTokenHash: tokenHash,
        ownerInviteExpiresAt: { gt: new Date() },
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
            ownerUserId: true,
          },
        },
        organizer: { select: { id: true, name: true } },
      },
    });
  },

  async updateMemberGym(
    memberGymId: string,
    data: Prisma.AssociationMemberGymUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).associationMemberGym.update({
      where: { id: memberGymId },
      data,
    });
  },

  async createMemberGym(
    data: Prisma.AssociationMemberGymCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).associationMemberGym.create({ data });
  },

  async nextMemberCodeNumber(organizerId: string, tx?: Prisma.TransactionClient) {
    const count = await db(tx).associationMemberGym.count({
      where: { organizerId },
    });
    return count + 1;
  },

  async searchGymCandidates(input: {
    businessNo?: string | null;
    gymName?: string | null;
    phone?: string | null;
    address?: string | null;
  }) {
    const ors: Prisma.GymWhereInput[] = [];
    const name = input.gymName?.trim();
    const phone = input.phone?.trim();
    const address = input.address?.trim();
    if (name) {
      ors.push({ name: { equals: name, mode: "insensitive" } });
    }
    if (phone) {
      ors.push({ phone: { equals: phone } });
    }
    if (address) {
      ors.push({ address: { equals: address, mode: "insensitive" } });
    }
    if (ors.length === 0) return [];
    return prisma.gym.findMany({
      where: { status: GymStatus.active, OR: ors },
      take: 20,
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
      },
      orderBy: { name: "asc" },
    });
  },

  async incrementJoinLinkUsedCount(linkId: string, tx?: Prisma.TransactionClient) {
    return db(tx).associationJoinLink.update({
      where: { id: linkId },
      data: { usedCount: { increment: 1 } },
    });
  },

  async countPendingApplications(organizerId: string) {
    return prisma.associationMemberGymApplication.count({
      where: {
        organizerId,
        status: {
          in: [
            AssociationMemberGymApplicationStatus.submitted,
            AssociationMemberGymApplicationStatus.under_review,
            AssociationMemberGymApplicationStatus.supplementation_requested,
            AssociationMemberGymApplicationStatus.resubmitted,
            AssociationMemberGymApplicationStatus.on_hold,
          ],
        },
      },
    });
  },

  async recentApplications(organizerId: string, take = 5) {
    return prisma.associationMemberGymApplication.findMany({
      where: { organizerId },
      orderBy: { submittedAt: "desc" },
      take,
      select: {
        id: true,
        gymName: true,
        ownerName: true,
        status: true,
        submittedAt: true,
        _count: { select: { attachments: true } },
      },
    });
  },

  async countActiveLinks(organizerId: string) {
    return prisma.associationJoinLink.count({
      where: {
        organizerId,
        status: AssociationJoinLinkStatus.active,
      },
    });
  },
};
