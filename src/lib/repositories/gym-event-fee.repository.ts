import { prisma } from "@/lib/prisma";

export const gymEventFeeRepository = {
  async findByGymAndEvent(gymId: string, eventId: string) {
    return prisma.gymEventFeeSetting.findUnique({
      where: {
        gymId_eventId: { gymId, eventId },
      },
    });
  },

  async upsert(input: {
    gymId: string;
    eventId: string;
    athleteFeeAmount: number;
    note?: string | null;
  }) {
    return prisma.gymEventFeeSetting.upsert({
      where: {
        gymId_eventId: {
          gymId: input.gymId,
          eventId: input.eventId,
        },
      },
      create: {
        gymId: input.gymId,
        eventId: input.eventId,
        athleteFeeAmount: input.athleteFeeAmount,
        note: input.note ?? null,
      },
      update: {
        athleteFeeAmount: input.athleteFeeAmount,
        note: input.note ?? null,
      },
    });
  },

  async listByGym(gymId: string) {
    return prisma.gymEventFeeSetting.findMany({
      where: { gymId },
      select: { eventId: true, athleteFeeAmount: true, note: true },
    });
  },
};
