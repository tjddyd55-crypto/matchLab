/**
 * [CONTRACT] PrismaClient import는 repositories 내부에만 허용.
 * MATCHON 메시징 전용 — 타 프로젝트 테이블 참조 금지.
 */
import type { Prisma } from "@/generated/prisma";
import {
  MatchonMessageChannel,
  MatchonMessageDispatchStatus,
  MatchonMessageOwnerType,
  MatchonMessageRecipientStatus,
  MatchonMessageSourceType,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export const matchonMessageRepository = {
  async createTemplate(
    data: Prisma.MatchonMessageTemplateCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).matchonMessageTemplate.create({ data });
  },

  async findTemplateById(id: string, tx?: Prisma.TransactionClient) {
    return db(tx).matchonMessageTemplate.findFirst({
      where: { id, deletedAt: null },
    });
  },

  async listTemplates(params?: {
    channel?: MatchonMessageChannel;
    includeDeleted?: boolean;
  }) {
    return prisma.matchonMessageTemplate.findMany({
      where: {
        deletedAt: params?.includeDeleted ? undefined : null,
        channel: params?.channel,
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
  },

  async countTemplates() {
    const [total, approved] = await Promise.all([
      prisma.matchonMessageTemplate.count({ where: { deletedAt: null } }),
      prisma.matchonMessageTemplate.count({
        where: { deletedAt: null, isApproved: true },
      }),
    ]);
    return { total, approved };
  },

  async findDispatchByIdempotency(scope: string, key: string) {
    return prisma.matchonMessageDispatch.findUnique({
      where: {
        idempotencyScope_idempotencyKey: {
          idempotencyScope: scope,
          idempotencyKey: key,
        },
      },
      include: { recipients: true },
    });
  },

  async createDispatchWithRecipients(
    params: {
      dispatch: {
        ownerType: MatchonMessageOwnerType;
        gymId?: string | null;
        sourceType: MatchonMessageSourceType;
        channel: MatchonMessageChannel;
        templateId?: string | null;
        title?: string | null;
        subjectSnapshot?: string | null;
        bodySnapshot: string;
        requestedCount: number;
        eligibleCount: number;
        excludedCount: number;
        dryRun: boolean;
        status: MatchonMessageDispatchStatus;
        idempotencyScope?: string | null;
        idempotencyKey?: string | null;
        blockedReason?: string | null;
        createdByUserId?: string | null;
        metadata?: unknown;
      };
      recipients: Array<{
        gymId?: string | null;
        referenceType?: string | null;
        referenceId?: string | null;
        recipientNameSnapshot?: string | null;
        phoneSnapshot: string;
        normalizedPhone: string;
        channel: MatchonMessageChannel;
        subjectSnapshot?: string | null;
        bodySnapshot: string;
        templateVariablesSnapshot?: unknown;
        status: MatchonMessageRecipientStatus;
        excludedReason?: string | null;
      }>;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      const dispatch = await tx.matchonMessageDispatch.create({
        data: {
          ownerType: params.dispatch.ownerType,
          gymId: params.dispatch.gymId ?? null,
          sourceType: params.dispatch.sourceType,
          channel: params.dispatch.channel,
          templateId: params.dispatch.templateId ?? null,
          title: params.dispatch.title ?? null,
          subjectSnapshot: params.dispatch.subjectSnapshot ?? null,
          bodySnapshot: params.dispatch.bodySnapshot,
          requestedCount: params.dispatch.requestedCount,
          eligibleCount: params.dispatch.eligibleCount,
          excludedCount: params.dispatch.excludedCount,
          dryRun: params.dispatch.dryRun,
          status: params.dispatch.status,
          idempotencyScope: params.dispatch.idempotencyScope ?? null,
          idempotencyKey: params.dispatch.idempotencyKey ?? null,
          blockedReason: params.dispatch.blockedReason ?? null,
          createdByUserId: params.dispatch.createdByUserId ?? null,
          metadata:
            params.dispatch.metadata === undefined
              ? undefined
              : (params.dispatch.metadata as Prisma.InputJsonValue),
        },
      });
      if (params.recipients.length) {
        await tx.matchonMessageRecipient.createMany({
          data: params.recipients.map((r) => ({
            dispatchId: dispatch.id,
            gymId: r.gymId ?? null,
            referenceType: r.referenceType ?? null,
            referenceId: r.referenceId ?? null,
            recipientNameSnapshot: r.recipientNameSnapshot ?? null,
            phoneSnapshot: r.phoneSnapshot,
            normalizedPhone: r.normalizedPhone,
            channel: r.channel,
            subjectSnapshot: r.subjectSnapshot ?? null,
            bodySnapshot: r.bodySnapshot,
            templateVariablesSnapshot:
              r.templateVariablesSnapshot === undefined
                ? undefined
                : (r.templateVariablesSnapshot as Prisma.InputJsonValue),
            status: r.status,
            excludedReason: r.excludedReason ?? null,
          })),
        });
      }
      return tx.matchonMessageDispatch.findUniqueOrThrow({
        where: { id: dispatch.id },
        include: { recipients: true },
      });
    });
  },

  async getDispatch(id: string) {
    return prisma.matchonMessageDispatch.findUnique({
      where: { id },
      include: {
        recipients: { orderBy: { createdAt: "asc" } },
        gym: { select: { id: true, name: true } },
        template: { select: { id: true, name: true, kakaoTemplateCode: true } },
      },
    });
  },

  async listDispatches(params?: { take?: number; skip?: number }) {
    return prisma.matchonMessageDispatch.findMany({
      orderBy: { createdAt: "desc" },
      take: params?.take ?? 50,
      skip: params?.skip ?? 0,
      include: {
        gym: { select: { id: true, name: true } },
      },
    });
  },

  async updateDispatchResult(
    id: string,
    data: {
      status: MatchonMessageDispatchStatus;
      successCount: number;
      failureCount: number;
      eligibleCount?: number;
      excludedCount?: number;
      dryRun: boolean;
      blockedReason?: string | null;
      startedAt?: Date;
      completedAt?: Date;
    },
  ) {
    return prisma.matchonMessageDispatch.update({
      where: { id },
      data,
    });
  },

  async updateRecipient(
    id: string,
    data: Prisma.MatchonMessageRecipientUpdateInput,
  ) {
    return prisma.matchonMessageRecipient.update({
      where: { id },
      data,
    });
  },

  async findLatestDispatchByStatus(status: MatchonMessageDispatchStatus) {
    return prisma.matchonMessageDispatch.findFirst({
      where: { status },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, blockedReason: true, status: true },
    });
  },
};
