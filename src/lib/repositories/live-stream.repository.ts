/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import { EventStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

const excludedEvent: EventStatus[] = [EventStatus.draft, EventStatus.cancelled];

export const liveStreamRepository = {
  async listPublicLiveStreamsByEventSlug(slug: string) {
    const event = await prisma.event.findFirst({
      where: {
        publicSlug: slug,
        status: { notIn: excludedEvent },
      },
      select: { id: true },
    });
    if (!event) return [];

    return prisma.eventLiveStream.findMany({
      where: {
        eventId: event.id,
        isPublic: true,
        watchUrl: { not: null },
      },
      orderBy: [{ matNumber: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        platform: true,
        streamType: true,
        matNumber: true,
        watchUrl: true,
        embedUrl: true,
        status: true,
        isPublic: true,
      },
    });
  },

  async listLiveStreamsByEventId(eventId: string) {
    return prisma.eventLiveStream.findMany({
      where: { eventId },
      orderBy: [{ matNumber: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        platform: true,
        streamType: true,
        matNumber: true,
        watchUrl: true,
        embedUrl: true,
        status: true,
        isPublic: true,
      },
    });
  },
};
