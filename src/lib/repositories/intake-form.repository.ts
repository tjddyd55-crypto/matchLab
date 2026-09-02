import "server-only";

import type { Prisma } from "@/generated/prisma";
import {
  IntakeFormSubmissionStatus,
  type IntakeFormFieldType,
  type IntakeFormStatus,
} from "@/lib/enums";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export type IntakeFormFieldRow = {
  stableKey: string;
  label: string;
  type: IntakeFormFieldType;
  placeholder: string | null;
  helpText: string | null;
  required: boolean;
  options: string[];
  displayOrder: number;
};

export const intakeFormRepository = {
  async listByOwner(input: {
    ownerType: "organizer" | "gym";
    organizerId?: string | null;
    gymId?: string | null;
  }) {
    const where =
      input.ownerType === "organizer"
        ? {
            ownerType: "organizer" as const,
            organizerId: input.organizerId!,
            deletedAt: null,
          }
        : {
            ownerType: "gym" as const,
            gymId: input.gymId!,
            deletedAt: null,
          };

    const rows = await prisma.intakeForm.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        status: true,
        publicToken: true,
        startsAt: true,
        closesAt: true,
        updatedAt: true,
        createdAt: true,
        _count: {
          select: {
            submissions: {
              where: {
                status: { not: IntakeFormSubmissionStatus.CANCELLED },
              },
            },
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      publicToken: row.publicToken,
      startsAt: row.startsAt,
      closesAt: row.closesAt,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
      submissionCount: row._count.submissions,
    }));
  },

  async findById(id: string, tx?: Prisma.TransactionClient) {
    return db(tx).intakeForm.findFirst({
      where: { id, deletedAt: null },
      include: {
        fields: { orderBy: [{ displayOrder: "asc" }, { stableKey: "asc" }] },
      },
    });
  },

  async findByIdForOwner(
    id: string,
    owner: {
      ownerType: "organizer" | "gym";
      organizerId?: string | null;
      gymId?: string | null;
    },
  ) {
    const where =
      owner.ownerType === "organizer"
        ? {
            id,
            deletedAt: null,
            ownerType: "organizer" as const,
            organizerId: owner.organizerId!,
          }
        : {
            id,
            deletedAt: null,
            ownerType: "gym" as const,
            gymId: owner.gymId!,
          };
    return prisma.intakeForm.findFirst({
      where,
      include: {
        fields: { orderBy: [{ displayOrder: "asc" }, { stableKey: "asc" }] },
      },
    });
  },

  async findByPublicToken(publicToken: string) {
    return prisma.intakeForm.findFirst({
      where: { publicToken, deletedAt: null },
      include: {
        fields: { orderBy: [{ displayOrder: "asc" }, { stableKey: "asc" }] },
      },
    });
  },

  async countActiveSubmissions(formId: string, tx?: Prisma.TransactionClient) {
    return db(tx).intakeFormSubmission.count({
      where: {
        formId,
        status: { not: IntakeFormSubmissionStatus.CANCELLED },
      },
    });
  },

  async create(
    data: Prisma.IntakeFormCreateInput,
    fields: IntakeFormFieldRow[],
    tx?: Prisma.TransactionClient,
  ) {
    const client = db(tx);
    const form = await client.intakeForm.create({ data });
    if (fields.length > 0) {
      await client.intakeFormField.createMany({
        data: fields.map((f) => ({
          formId: form.id,
          stableKey: f.stableKey,
          label: f.label,
          type: f.type,
          placeholder: f.placeholder,
          helpText: f.helpText,
          required: f.required,
          optionsJson: f.options.length > 0 ? f.options : undefined,
          displayOrder: f.displayOrder,
        })),
      });
    }
    return form;
  },

  async replaceFields(
    formId: string,
    fields: IntakeFormFieldRow[],
    tx?: Prisma.TransactionClient,
  ) {
    const client = db(tx);
    await client.intakeFormField.deleteMany({ where: { formId } });
    if (fields.length > 0) {
      await client.intakeFormField.createMany({
        data: fields.map((f) => ({
          formId,
          stableKey: f.stableKey,
          label: f.label,
          type: f.type,
          placeholder: f.placeholder,
          helpText: f.helpText,
          required: f.required,
          optionsJson: f.options.length > 0 ? f.options : undefined,
          displayOrder: f.displayOrder,
        })),
      });
    }
  },

  async updateMeta(
    formId: string,
    data: Prisma.IntakeFormUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).intakeForm.update({ where: { id: formId }, data });
  },

  async softDelete(formId: string) {
    return prisma.intakeForm.update({
      where: { id: formId },
      data: { deletedAt: new Date(), status: "CLOSED" },
    });
  },

  async listSubmissions(formId: string) {
    return prisma.intakeFormSubmission.findMany({
      where: { formId },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      include: {
        answers: {
          orderBy: { fieldLabelSnapshot: "asc" },
        },
      },
    });
  },

  async findSubmissionForForm(formId: string, submissionId: string) {
    return prisma.intakeFormSubmission.findFirst({
      where: { id: submissionId, formId },
      include: {
        answers: true,
      },
    });
  },

  async createSubmission(
    input: {
      formId: string;
      submitterUserId?: string | null;
      answers: Array<{
        fieldId: string | null;
        fieldLabelSnapshot: string;
        fieldTypeSnapshot: IntakeFormFieldType;
        valueJson: Prisma.InputJsonValue;
      }>;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = db(tx);
    return client.intakeFormSubmission.create({
      data: {
        formId: input.formId,
        submitterUserId: input.submitterUserId ?? null,
        answers: {
          create: input.answers.map((a) => ({
            fieldId: a.fieldId,
            fieldLabelSnapshot: a.fieldLabelSnapshot,
            fieldTypeSnapshot: a.fieldTypeSnapshot,
            valueJson: a.valueJson,
          })),
        },
      },
    });
  },

  async updateSubmissionStatus(
    submissionId: string,
    status: IntakeFormSubmissionStatus,
    adminMemo?: string | null,
  ) {
    return prisma.intakeFormSubmission.update({
      where: { id: submissionId },
      data: {
        status,
        adminMemo: adminMemo ?? undefined,
      },
    });
  },

  async listFormOptionsForOwner(input: {
    ownerType: "organizer" | "gym";
    organizerId?: string | null;
    gymId?: string | null;
  }) {
    const where =
      input.ownerType === "organizer"
        ? {
            ownerType: "organizer" as const,
            organizerId: input.organizerId!,
            deletedAt: null,
          }
        : {
            ownerType: "gym" as const,
            gymId: input.gymId!,
            deletedAt: null,
          };
    return prisma.intakeForm.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      select: { id: true, title: true, status: true },
    });
  },
};

export function mapIntakeFormFieldRow(
  field: {
    stableKey: string;
    label: string;
    type: IntakeFormFieldType;
    placeholder: string | null;
    helpText: string | null;
    required: boolean;
    optionsJson: Prisma.JsonValue;
    displayOrder: number;
  },
): IntakeFormFieldRow {
  const options = Array.isArray(field.optionsJson)
    ? field.optionsJson.filter((x): x is string => typeof x === "string")
    : [];
  return {
    stableKey: field.stableKey,
    label: field.label,
    type: field.type,
    placeholder: field.placeholder,
    helpText: field.helpText,
    required: field.required,
    options,
    displayOrder: field.displayOrder,
  };
}

export function mapIntakeFormFieldsFromDb(
  fields: Array<{
    id: string;
    stableKey: string;
    label: string;
    type: IntakeFormFieldType;
    placeholder: string | null;
    helpText: string | null;
    required: boolean;
    optionsJson: Prisma.JsonValue;
    displayOrder: number;
  }>,
) {
  return fields.map((f) => ({
    id: f.id,
    ...mapIntakeFormFieldRow(f),
  }));
}
