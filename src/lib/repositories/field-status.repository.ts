import "server-only";

import {
  ApplicationStatus,
  CheckInStatus,
  Prisma,
  WeighInStatus,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

const db = (tx?: Prisma.TransactionClient) => tx ?? prisma;

const applicationSelect = {
  id: true,
  eventId: true,
  divisionId: true,
  gymId: true,
  fighterId: true,
  status: true,
  checkInStatus: true,
  weighInStatus: true,
  weighInWeightKg: true,
  fieldMemo: true,
  fighterSnapshot: true,
  fighter: {
    select: {
      id: true,
      name: true,
    },
  },
  gym: {
    select: {
      id: true,
      name: true,
    },
  },
  division: {
    select: {
      id: true,
      sportType: true,
      ruleType: true,
      gender: true,
      ageGroup: true,
      weightClass: true,
      skillLevel: true,
    },
  },
} satisfies Prisma.EventApplicationSelect;

export type FieldStatusApplicationRow = Prisma.EventApplicationGetPayload<{
  select: typeof applicationSelect;
}>;

export const fieldStatusRepository = {
  async listApprovedApplicationsForEvent(
    eventId: string,
    filters?: {
      gymId?: string;
      divisionId?: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<FieldStatusApplicationRow[]> {
    return db(tx).eventApplication.findMany({
      where: {
        eventId,
        status: ApplicationStatus.approved,
        ...(filters?.gymId ? { gymId: filters.gymId } : {}),
        ...(filters?.divisionId ? { divisionId: filters.divisionId } : {}),
      },
      orderBy: [{ gym: { name: "asc" } }, { createdAt: "asc" }],
      select: applicationSelect,
    });
  },

  async findApprovedApplicationById(
    applicationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<FieldStatusApplicationRow | null> {
    return db(tx).eventApplication.findFirst({
      where: {
        id: applicationId,
        status: ApplicationStatus.approved,
      },
      select: applicationSelect,
    });
  },

  async updateFieldStatus(
    applicationId: string,
    data: {
      checkInStatus?: CheckInStatus;
      weighInStatus?: WeighInStatus;
      weighInWeightKg?: number | null;
      fieldMemo?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<FieldStatusApplicationRow> {
    return db(tx).eventApplication.update({
      where: { id: applicationId },
      data,
      select: applicationSelect,
    });
  },
};
