import type { Prisma } from "@/generated/prisma";
import { MemberSportTemplateCode } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import {
  parseGymMemberFieldOptionsJson,
  type GymMemberDynamicFieldDefinition,
} from "@/lib/gym-member-profile/fields";
import type { MemberSportTemplateWithFields } from "@/lib/gym-member-profile/types";

type SportTemplateRow = {
  id: string;
  code: import("@/lib/enums").MemberSportTemplateCode;
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
      },
    });
  },

  async findByCode(code: MemberSportTemplateCode) {
    return prisma.memberSportTemplate.findUnique({
      where: { code },
      include: {
        fields: { orderBy: { displayOrder: "asc" } },
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
      if (row.valueJson === null || row.valueJson === undefined) {
        await client.gymMemberProfileValue.deleteMany({
          where: {
            gymMemberId,
            sourceType: row.sourceType,
            stableKey: row.stableKey,
          },
        });
        continue;
      }
      await client.gymMemberProfileValue.upsert({
        where: {
          gymMemberId_sourceType_stableKey: {
            gymMemberId,
            sourceType: row.sourceType,
            stableKey: row.stableKey,
          },
        },
        create: {
          gymMember: { connect: { id: gymMemberId } },
          sourceType: row.sourceType,
          stableKey: row.stableKey,
          valueJson: row.valueJson as Prisma.InputJsonValue,
          ...(row.sportTemplateFieldId
            ? { sportTemplateField: { connect: { id: row.sportTemplateFieldId } } }
            : {}),
          ...(row.gymCustomFieldId
            ? { gymCustomField: { connect: { id: row.gymCustomFieldId } } }
            : {}),
        },
        update: {
          valueJson: row.valueJson as Prisma.InputJsonValue,
          ...(row.sportTemplateFieldId
            ? { sportTemplateField: { connect: { id: row.sportTemplateFieldId } } }
            : {}),
          ...(row.gymCustomFieldId
            ? { gymCustomField: { connect: { id: row.gymCustomFieldId } } }
            : {}),
        },
      });
    }
  },
};
