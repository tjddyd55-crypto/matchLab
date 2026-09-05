import "server-only";

import { prisma } from "@/lib/prisma";

export const onsiteOpsAccessRepository = {
  findByTokenHash(tokenHash: string) {
    return prisma.eventOnsiteOpsAccessLink.findFirst({
      where: { tokenHash },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            status: true,
            eventDate: true,
            locationName: true,
            location: true,
          },
        },
      },
    });
  },

  findByEventId(eventId: string) {
    return prisma.eventOnsiteOpsAccessLink.findUnique({
      where: { eventId },
    });
  },

  create(input: {
    eventId: string;
    tokenHash: string;
    publicToken: string;
    createdByUserId: string | null;
  }) {
    return prisma.eventOnsiteOpsAccessLink.create({
      data: {
        eventId: input.eventId,
        tokenHash: input.tokenHash,
        publicToken: input.publicToken,
        createdByUserId: input.createdByUserId,
        isActive: true,
      },
    });
  },

  rotate(input: {
    linkId: string;
    tokenHash: string;
    publicToken: string;
  }) {
    return prisma.eventOnsiteOpsAccessLink.update({
      where: { id: input.linkId },
      data: {
        tokenHash: input.tokenHash,
        publicToken: input.publicToken,
        isActive: true,
        revokedAt: null,
        lastRotatedAt: new Date(),
      },
    });
  },

  revoke(linkId: string) {
    return prisma.eventOnsiteOpsAccessLink.update({
      where: { id: linkId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        publicToken: null,
      },
    });
  },
};
