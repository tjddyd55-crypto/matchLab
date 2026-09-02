import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { dedupeTemplateIds } from "@/lib/gym-member-profile/multi-sport";
import { memberSportTemplateRepository } from "@/lib/repositories/gym-member-profile.repository";
import { AppError } from "@/lib/errors/app-error";

type Tx = Prisma.TransactionClient;

export const gymSportTemplateAssignmentRepository = {
  async listForGym(gymId: string, opts?: { activeOnly?: boolean }) {
    return prisma.gymSportTemplateAssignment.findMany({
      where: {
        gymId,
        ...(opts?.activeOnly ? { isActive: true } : {}),
      },
      include: {
        template: {
          include: {
            fields: { orderBy: { displayOrder: "asc" as const } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async countActiveByTemplate(templateId: string) {
    return prisma.gymSportTemplateAssignment.count({
      where: { templateId, isActive: true },
    });
  },

  async countAnyByTemplate(templateId: string) {
    return prisma.gymSportTemplateAssignment.count({
      where: { templateId },
    });
  },

  async upsertActive(
    gymId: string,
    templateId: string,
    tx?: Tx,
  ) {
    const client = tx ?? prisma;
    return client.gymSportTemplateAssignment.upsert({
      where: {
        gymId_templateId: { gymId, templateId },
      },
      create: {
        gymId,
        templateId,
        isActive: true,
      },
      update: {
        isActive: true,
      },
    });
  },

  async setActive(
    gymId: string,
    templateId: string,
    isActive: boolean,
    tx?: Tx,
  ) {
    const client = tx ?? prisma;
    return client.gymSportTemplateAssignment.update({
      where: {
        gymId_templateId: { gymId, templateId },
      },
      data: { isActive },
    });
  },

  async syncFromTemplateIds(
    gymId: string,
    templateIds: string[],
    tx?: Tx,
  ) {
    const client = tx ?? prisma;
    const ids = dedupeTemplateIds(templateIds);
    for (const templateId of ids) {
      await client.gymSportTemplateAssignment.upsert({
        where: { gymId_templateId: { gymId, templateId } },
        create: { gymId, templateId, isActive: true },
        update: { isActive: true },
      });
    }
  },
};

export const gymApplicationSportTemplateRepository = {
  async listForApplication(applicationId: string) {
    return prisma.gymApplicationSportTemplate.findMany({
      where: { applicationId },
      orderBy: { createdAt: "asc" },
    });
  },

  async replaceSelections(
    applicationId: string,
    templateIds: string[],
    tx?: Tx,
  ) {
    const client = tx ?? prisma;
    const ids = dedupeTemplateIds(templateIds);
    if (ids.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "운영 종목을 1개 이상 선택해 주세요.",
      );
    }

    const templates = await client.memberSportTemplate.findMany({
      where: { id: { in: ids }, active: true },
      select: { id: true, code: true, name: true },
    });
    if (templates.length !== ids.length) {
      throw new AppError(
        "VALIDATION_ERROR",
        "선택할 수 없는 종목이 포함되어 있습니다.",
      );
    }
    const byId = new Map(templates.map((t) => [t.id, t]));

    await client.gymApplicationSportTemplate.deleteMany({
      where: { applicationId },
    });
    await client.gymApplicationSportTemplate.createMany({
      data: ids.map((templateId) => {
        const t = byId.get(templateId)!;
        return {
          applicationId,
          templateId,
          templateCodeSnapshot: t.code,
          templateNameSnapshot: t.name,
        };
      }),
    });
  },
};

export const gymMemberSportTemplateAssignmentRepository = {
  async listForMember(gymMemberId: string, opts?: { activeOnly?: boolean }) {
    return prisma.gymMemberSportTemplateAssignment.findMany({
      where: {
        gymMemberId,
        ...(opts?.activeOnly ? { isActive: true } : {}),
      },
      include: {
        template: {
          include: {
            fields: { orderBy: { displayOrder: "asc" as const } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async syncActive(
    gymMemberId: string,
    templateIds: string[],
    tx?: Tx,
  ) {
    const client = tx ?? prisma;
    const ids = dedupeTemplateIds(templateIds);

    const existing = await client.gymMemberSportTemplateAssignment.findMany({
      where: { gymMemberId },
      select: { templateId: true, isActive: true },
    });
    const existingIds = new Set(existing.map((e) => e.templateId));

    for (const templateId of ids) {
      await client.gymMemberSportTemplateAssignment.upsert({
        where: {
          gymMemberId_templateId: { gymMemberId, templateId },
        },
        create: { gymMemberId, templateId, isActive: true },
        update: { isActive: true },
      });
    }

    for (const row of existing) {
      if (!ids.includes(row.templateId) && row.isActive) {
        await client.gymMemberSportTemplateAssignment.update({
          where: {
            gymMemberId_templateId: {
              gymMemberId,
              templateId: row.templateId,
            },
          },
          data: { isActive: false },
        });
      }
    }

    return { activeTemplateIds: ids, previouslyKnown: [...existingIds] };
  },
};

/** Resolve active sport templates for a gym (assignment SSOT + legacy FK fallback). */
export async function resolveGymActiveSportTemplates(gymId: string) {
  const assignments = await gymSportTemplateAssignmentRepository.listForGym(
    gymId,
    { activeOnly: true },
  );
  const fromAssignments = assignments
    .filter((a) => a.template.active)
    .map((a) => memberSportTemplateRepository.mapWithActiveFields(a.template));

  if (fromAssignments.length > 0) return fromAssignments;

  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { memberSportTemplateId: true },
  });
  if (!gym?.memberSportTemplateId) return [];
  const row = await memberSportTemplateRepository.findById(
    gym.memberSportTemplateId,
  );
  if (!row?.active) return [];
  return [memberSportTemplateRepository.mapWithActiveFields(row)];
}
