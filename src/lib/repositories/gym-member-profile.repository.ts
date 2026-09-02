import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  parseGymMemberFieldOptionsJson,
  type GymMemberDynamicFieldDefinition,
} from "@/lib/gym-member-profile/fields";
import type { MemberSportTemplateWithFields } from "@/lib/gym-member-profile/types";

type SportTemplateRow = {
  id: string;
  code: string;
  name: string;
  sportType: string;
  active: boolean;
  version: number;
  fields: Array<{
    id: string;
    stableKey: string;
    label: string;
    type: GymMemberDynamicFieldDefinition["type"];
    required: boolean;
    placeholder: string | null;
    helpText: string | null;
    optionsJson: unknown;
    displayOrder: number;
    active: boolean;
  }>;
};

export const KICKBOXING_TEMPLATE_ID = "cmskickboxingtpl001";

export type { MemberSportTemplateWithFields } from "@/lib/gym-member-profile/types";

function mapSportField(row: {
  id: string;
  stableKey: string;
  label: string;
  type: GymMemberDynamicFieldDefinition["type"];
  required: boolean;
  placeholder: string | null;
  helpText: string | null;
  optionsJson: unknown;
  displayOrder: number;
  active: boolean;
}): GymMemberDynamicFieldDefinition {
  return {
    id: row.id,
    stableKey: row.stableKey,
    label: row.label,
    type: row.type,
    required: row.required,
    placeholder: row.placeholder ?? undefined,
    helpText: row.helpText ?? undefined,
    options: parseGymMemberFieldOptionsJson(row.optionsJson),
    displayOrder: row.displayOrder,
    active: row.active,
  };
}

export const memberSportTemplateRepository = {
  async findById(id: string) {
    return prisma.memberSportTemplate.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { displayOrder: "asc" } },
        _count: {
          select: {
            gymAssignments: { where: { isActive: true } },
            legacyGyms: true,
          },
        },
      },
    });
  },

  async findByCode(code: string) {
    return prisma.memberSportTemplate.findUnique({
      where: { code },
      include: {
        fields: { orderBy: { displayOrder: "asc" } },
      },
    });
  },

  async listAll() {
    return prisma.memberSportTemplate.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: {
        fields: { orderBy: { displayOrder: "asc" } },
        _count: {
          select: {
            gymAssignments: { where: { isActive: true } },
            fields: true,
          },
        },
      },
    });
  },

  async listActive() {
    return prisma.memberSportTemplate.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        fields: {
          where: { active: true },
          orderBy: { displayOrder: "asc" },
        },
      },
    });
  },

  async create(
    data: Prisma.MemberSportTemplateCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.memberSportTemplate.create({ data });
  },

  async update(
    id: string,
    data: Prisma.MemberSportTemplateUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.memberSportTemplate.update({ where: { id }, data });
  },

  mapWithActiveFields(row: SportTemplateRow): MemberSportTemplateWithFields {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      sportType: row.sportType,
      active: row.active,
      version: row.version,
      fields: row.fields
        .filter((f: SportTemplateRow["fields"][number]) => f.active)
        .map(mapSportField),
    };
  },

  mapWithAllFields(row: SportTemplateRow): MemberSportTemplateWithFields {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      sportType: row.sportType,
      active: row.active,
      version: row.version,
      fields: row.fields.map(mapSportField),
    };
  },
};

export const memberSportTemplateFieldRepository = {
  async create(
    data: Prisma.MemberSportTemplateFieldCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.memberSportTemplateField.create({ data });
  },

  async update(
    id: string,
    data: Prisma.MemberSportTemplateFieldUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.memberSportTemplateField.update({ where: { id }, data });
  },

  async delete(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.memberSportTemplateField.delete({ where: { id } });
  },

  async countValues(fieldId: string) {
    return prisma.gymMemberProfileValue.count({
      where: { sportTemplateFieldId: fieldId },
    });
  },

  mapField: mapSportField,
};

export const gymMemberCustomFieldRepository = {
  async listForGym(gymId: string, includeInactive = false) {
    return prisma.gymMemberCustomField.findMany({
      where: {
        gymId,
        ...(includeInactive ? {} : { active: true }),
      },
      orderBy: { displayOrder: "asc" },
    });
  },

  async findByIdForGym(id: string, gymId: string) {
    return prisma.gymMemberCustomField.findFirst({
      where: { id, gymId },
    });
  },

  async create(
    data: Prisma.GymMemberCustomFieldCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.gymMemberCustomField.create({ data });
  },

  async update(
    id: string,
    data: Prisma.GymMemberCustomFieldUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.gymMemberCustomField.update({ where: { id }, data });
  },

  async delete(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.gymMemberCustomField.delete({ where: { id } });
  },

  async countValues(fieldId: string) {
    return prisma.gymMemberProfileValue.count({
      where: { gymCustomFieldId: fieldId },
    });
  },

  async countValuesByStableKey(gymId: string, stableKey: string) {
    return prisma.gymMemberProfileValue.count({
      where: {
        sourceType: "GYM",
        stableKey,
        gymMember: { gymId },
      },
    });
  },

  mapField(row: {
    id: string;
    stableKey: string;
    label: string;
    type: GymMemberDynamicFieldDefinition["type"];
    required: boolean;
    placeholder: string | null;
    helpText: string | null;
    optionsJson: unknown;
    displayOrder: number;
    active: boolean;
  }): GymMemberDynamicFieldDefinition {
    return {
      id: row.id,
      stableKey: row.stableKey,
      label: row.label,
      type: row.type,
      required: row.required,
      placeholder: row.placeholder ?? undefined,
      helpText: row.helpText ?? undefined,
      options: parseGymMemberFieldOptionsJson(row.optionsJson),
      displayOrder: row.displayOrder,
      active: row.active,
    };
  },
};

export const gymMemberProfileValueRepository = {
  async listForMember(gymMemberId: string) {
    return prisma.gymMemberProfileValue.findMany({
      where: { gymMemberId },
    });
  },

  async upsertMany(
    gymMemberId: string,
    rows: Array<{
      sourceType: "SPORT" | "GYM";
      stableKey: string;
      valueJson: unknown;
      sportTemplateFieldId?: string | null;
      gymCustomFieldId?: string | null;
    }>,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    for (const row of rows) {
      const existing =
        row.sourceType === "SPORT" && row.sportTemplateFieldId
          ? await client.gymMemberProfileValue.findFirst({
              where: {
                gymMemberId,
                sportTemplateFieldId: row.sportTemplateFieldId,
              },
            })
          : row.sourceType === "GYM" && row.gymCustomFieldId
            ? await client.gymMemberProfileValue.findFirst({
                where: {
                  gymMemberId,
                  gymCustomFieldId: row.gymCustomFieldId,
                },
              })
            : await client.gymMemberProfileValue.findFirst({
                where: {
                  gymMemberId,
                  sourceType: row.sourceType,
                  stableKey: row.stableKey,
                  sportTemplateFieldId: null,
                  gymCustomFieldId: null,
                },
              });

      if (row.valueJson === null || row.valueJson === undefined) {
        if (existing) {
          await client.gymMemberProfileValue.delete({
            where: { id: existing.id },
          });
        }
        continue;
      }

      if (existing) {
        await client.gymMemberProfileValue.update({
          where: { id: existing.id },
          data: {
            valueJson: row.valueJson as Prisma.InputJsonValue,
            stableKey: row.stableKey,
            ...(row.sportTemplateFieldId
              ? { sportTemplateFieldId: row.sportTemplateFieldId }
              : {}),
            ...(row.gymCustomFieldId
              ? { gymCustomFieldId: row.gymCustomFieldId }
              : {}),
          },
        });
        continue;
      }

      await client.gymMemberProfileValue.create({
        data: {
          gymMember: { connect: { id: gymMemberId } },
          sourceType: row.sourceType,
          stableKey: row.stableKey,
          valueJson: row.valueJson as Prisma.InputJsonValue,
          ...(row.sportTemplateFieldId
            ? {
                sportTemplateField: {
                  connect: { id: row.sportTemplateFieldId },
                },
              }
            : {}),
          ...(row.gymCustomFieldId
            ? { gymCustomField: { connect: { id: row.gymCustomFieldId } } }
            : {}),
        },
      });
    }
  },
};
