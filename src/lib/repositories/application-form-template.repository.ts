/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export type ApplicationFormTemplateListRow = {
  id: string;
  organizerId: string | null;
  title: string;
  description: string | null;
  originalPdfPath: string;
  originalPdfFileName: string;
  fieldsJson: Prisma.JsonValue;
  repeatGroupsJson: Prisma.JsonValue;
  manualFieldsJson: Prisma.JsonValue | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  organizer: { id: string; name: string } | null;
};

export const applicationFormTemplateRepository = {
  async list(
    options?: { organizerId?: string; activeOnly?: boolean },
    tx?: Prisma.TransactionClient,
  ): Promise<ApplicationFormTemplateListRow[]> {
    const organizerId = options?.organizerId?.trim();
    return db(tx).applicationFormTemplate.findMany({
      where: {
        ...(organizerId ? { organizerId } : {}),
        ...(options?.activeOnly ? { isActive: true } : {}),
      },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        organizer: { select: { id: true, name: true } },
      },
    });
  },

  async findById(id: string, tx?: Prisma.TransactionClient) {
    return db(tx).applicationFormTemplate.findUnique({ where: { id } });
  },

  async create(
    data: {
      organizerId?: string | null;
      title: string;
      description?: string | null;
      originalPdfPath: string;
      originalPdfFileName: string;
      fieldsJson: Prisma.InputJsonValue;
      repeatGroupsJson: Prisma.InputJsonValue;
      manualFieldsJson?: Prisma.InputJsonValue | null;
      consentMappingJson?: Prisma.InputJsonValue | null;
      isActive?: boolean;
      createdByAdminUserId?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).applicationFormTemplate.create({
      data: {
        organizerId: data.organizerId?.trim() || null,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        originalPdfPath: data.originalPdfPath.trim(),
        originalPdfFileName: data.originalPdfFileName.trim(),
        fieldsJson: data.fieldsJson,
        repeatGroupsJson: data.repeatGroupsJson,
        manualFieldsJson: data.manualFieldsJson ?? undefined,
        consentMappingJson: data.consentMappingJson ?? undefined,
        isActive: data.isActive ?? true,
        createdByAdminUserId: data.createdByAdminUserId ?? null,
      },
    });
  },

  async update(
    id: string,
    data: {
      organizerId?: string | null;
      title?: string;
      description?: string | null;
      originalPdfPath?: string;
      originalPdfFileName?: string;
      fieldsJson?: Prisma.InputJsonValue;
      repeatGroupsJson?: Prisma.InputJsonValue;
      manualFieldsJson?: Prisma.InputJsonValue | null;
      consentMappingJson?: Prisma.InputJsonValue | null;
      isActive?: boolean;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).applicationFormTemplate.update({
      where: { id },
      data: {
        ...(data.organizerId !== undefined
          ? {
              organizerId:
                data.organizerId === null || data.organizerId.trim() === ""
                  ? null
                  : data.organizerId.trim(),
            }
          : {}),
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() || null }
          : {}),
        ...(data.originalPdfPath !== undefined
          ? { originalPdfPath: data.originalPdfPath.trim() }
          : {}),
        ...(data.originalPdfFileName !== undefined
          ? { originalPdfFileName: data.originalPdfFileName.trim() }
          : {}),
        ...(data.fieldsJson !== undefined ? { fieldsJson: data.fieldsJson } : {}),
        ...(data.repeatGroupsJson !== undefined
          ? { repeatGroupsJson: data.repeatGroupsJson }
          : {}),
        ...(data.manualFieldsJson !== undefined
          ? { manualFieldsJson: data.manualFieldsJson }
          : {}),
        ...(data.consentMappingJson !== undefined
          ? { consentMappingJson: data.consentMappingJson }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      } as Prisma.ApplicationFormTemplateUncheckedUpdateInput,
    });
  },
};
