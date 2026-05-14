/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import {
  DuplicateCheckStatus,
  FighterRegistrationSubmissionStatus,
  type ConsentStatus,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export type FighterRegistrationSubmissionFull = {
  id: string;
  gymId: string;
  inviteLinkId: string | null;
  name: string;
  birthDate: Date;
  gender: string;
  phone: string;
  height: number | null;
  weight: number | null;
  profileImageUrl: string | null;
  schoolName: string | null;
  grade: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  status: FighterRegistrationSubmissionStatus;
  duplicateCheckStatus: DuplicateCheckStatus;
  submittedAt: Date;
};

export type GymRegistrationSubmissionListRow = FighterRegistrationSubmissionFull & {
  inviteLink: { token: string } | null;
  guardianConsents: {
    id: string;
    consentStatus: ConsentStatus;
  }[];
};

export const registrationRepository = {
  async findGymNameById(gymId: string): Promise<{ name: string } | null> {
    return prisma.gym.findUnique({
      where: { id: gymId },
      select: { name: true },
    });
  },

  async createFighterRegistrationSubmission(
    data: {
      gymId: string;
      inviteLinkId: string | null;
      name: string;
      birthDate: Date;
      gender: string;
      phone: string;
      height?: number | null;
      weight?: number | null;
      profileImageUrl?: string | null;
      schoolName?: string | null;
      grade?: string | null;
      guardianName?: string | null;
      guardianPhone?: string | null;
      status: FighterRegistrationSubmissionStatus;
      duplicateCheckStatus: DuplicateCheckStatus;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string }> {
    const row = await db(tx).fighterRegistrationSubmission.create({
      data: {
        gymId: data.gymId,
        inviteLinkId: data.inviteLinkId,
        name: data.name,
        birthDate: data.birthDate,
        gender: data.gender,
        phone: data.phone,
        height: data.height,
        weight: data.weight,
        profileImageUrl: data.profileImageUrl,
        schoolName: data.schoolName,
        grade: data.grade,
        guardianName: data.guardianName,
        guardianPhone: data.guardianPhone,
        status: data.status,
        duplicateCheckStatus: data.duplicateCheckStatus,
      },
      select: { id: true },
    });
    return row;
  },

  async findSubmissionById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<FighterRegistrationSubmissionFull | null> {
    const row = await db(tx).fighterRegistrationSubmission.findUnique({
      where: { id },
      select: {
        id: true,
        gymId: true,
        inviteLinkId: true,
        name: true,
        birthDate: true,
        gender: true,
        phone: true,
        height: true,
        weight: true,
        profileImageUrl: true,
        schoolName: true,
        grade: true,
        guardianName: true,
        guardianPhone: true,
        status: true,
        duplicateCheckStatus: true,
        submittedAt: true,
      },
    });
    return row as FighterRegistrationSubmissionFull | null;
  },

  async listGymRegistrationSubmissions(
    gymId: string,
  ): Promise<GymRegistrationSubmissionListRow[]> {
    const rows = await prisma.fighterRegistrationSubmission.findMany({
      where: { gymId },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        gymId: true,
        inviteLinkId: true,
        name: true,
        birthDate: true,
        gender: true,
        phone: true,
        height: true,
        weight: true,
        profileImageUrl: true,
        schoolName: true,
        grade: true,
        guardianName: true,
        guardianPhone: true,
        status: true,
        duplicateCheckStatus: true,
        submittedAt: true,
        inviteLink: { select: { token: true } },
        guardianConsents: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, consentStatus: true },
        },
      },
    });
    return rows as GymRegistrationSubmissionListRow[];
  },

  async updateSubmissionStatus(
    id: string,
    patch: {
      status?: FighterRegistrationSubmissionStatus;
      duplicateCheckStatus?: DuplicateCheckStatus;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).fighterRegistrationSubmission.update({
      where: { id },
      data: patch,
    });
  },
};
