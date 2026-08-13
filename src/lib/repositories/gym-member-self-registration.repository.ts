import "server-only";

import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  GymMemberRegistrationRequestStatus,
  GymMemberSelfRegistrationLinkStatus,
} from "@/lib/enums";

export const gymMemberSelfRegistrationRepository = {
  findLinkByGymId(gymId: string) {
    return prisma.gymMemberSelfRegistrationLink.findUnique({
      where: { gymId },
    });
  },

  findLinkById(id: string) {
    return prisma.gymMemberSelfRegistrationLink.findUnique({
      where: { id },
      include: {
        gym: { select: { id: true, name: true } },
      },
    });
  },

  findLinkByTokenHash(tokenHash: string) {
    return prisma.gymMemberSelfRegistrationLink.findUnique({
      where: { tokenHash },
      include: {
        gym: { select: { id: true, name: true } },
      },
    });
  },

  createLink(
    data: Prisma.GymMemberSelfRegistrationLinkCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? prisma).gymMemberSelfRegistrationLink.create({ data });
  },

  updateLink(
    id: string,
    data: Prisma.GymMemberSelfRegistrationLinkUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? prisma).gymMemberSelfRegistrationLink.update({
      where: { id },
      data,
    });
  },

  findActiveTerms(gymId: string) {
    return prisma.gymMemberRegistrationTerms.findFirst({
      where: { gymId, isActive: true },
      orderBy: { version: "desc" },
    });
  },

  findLatestTermsVersion(gymId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? prisma).gymMemberRegistrationTerms.findFirst({
      where: { gymId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
  },

  createTerms(
    data: Prisma.GymMemberRegistrationTermsCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? prisma).gymMemberRegistrationTerms.create({ data });
  },

  deactivateTermsForGym(gymId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? prisma).gymMemberRegistrationTerms.updateMany({
      where: { gymId, isActive: true },
      data: { isActive: false },
    });
  },

  createRequest(
    data: Prisma.GymMemberRegistrationRequestCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? prisma).gymMemberRegistrationRequest.create({ data });
  },

  findRequestByClientSubmission(linkId: string, clientSubmissionId: string) {
    return prisma.gymMemberRegistrationRequest.findUnique({
      where: {
        linkId_clientSubmissionId: { linkId, clientSubmissionId },
      },
    });
  },

  findRequestById(gymId: string, requestId: string) {
    return prisma.gymMemberRegistrationRequest.findFirst({
      where: { id: requestId, gymId },
    });
  },

  findRequestByApprovedMember(gymId: string, gymMemberId: string) {
    return prisma.gymMemberRegistrationRequest.findFirst({
      where: { gymId, approvedGymMemberId: gymMemberId },
    });
  },

  countPending(gymId: string) {
    return prisma.gymMemberRegistrationRequest.count({
      where: {
        gymId,
        status: GymMemberRegistrationRequestStatus.pending,
      },
    });
  },

  listRequests(
    gymId: string,
    input: {
      status?: GymMemberRegistrationRequestStatus;
      page: number;
      pageSize: number;
    },
  ) {
    const where = {
      gymId,
      ...(input.status ? { status: input.status } : {}),
    };
    return Promise.all([
      prisma.gymMemberRegistrationRequest.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        select: {
          id: true,
          name: true,
          phone: true,
          birthDate: true,
          status: true,
          healthHasAnyYes: true,
          submittedAt: true,
        },
      }),
      prisma.gymMemberRegistrationRequest.count({ where }),
    ]);
  },

  updateRequest(
    id: string,
    data: Prisma.GymMemberRegistrationRequestUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? prisma).gymMemberRegistrationRequest.update({
      where: { id },
      data,
    });
  },

  incrementLinkSubmission(linkId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? prisma).gymMemberSelfRegistrationLink.update({
      where: { id: linkId },
      data: {
        submissionCount: { increment: 1 },
        lastSubmittedAt: new Date(),
      },
    });
  },
};
