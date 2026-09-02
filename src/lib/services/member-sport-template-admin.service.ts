import "server-only";

import type { Prisma } from "@/generated/prisma";
import { Prisma as PrismaClient } from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  normalizeGymMemberDynamicFields,
  suggestGymMemberCustomFieldKey,
  validateGymMemberDynamicFieldDefinitions,
  type GymMemberDynamicFieldDefinition,
} from "@/lib/gym-member-profile/fields";
import { validateMemberSportTemplateCode } from "@/lib/gym-member-profile/sport-template-code";
import { assertCompatibleGymMemberFieldTypeChange } from "@/lib/gym-member-profile/type-change";
import {
  memberSportTemplateFieldRepository,
  memberSportTemplateRepository,
} from "@/lib/repositories/gym-member-profile.repository";
import { prisma } from "@/lib/prisma";

function requireAdmin(actor: ActorContext) {
  if (actor.role !== "admin") {
    throw new AppError("FORBIDDEN", "관리자만 접근할 수 있습니다.");
  }
}

function optionsToJson(
  options: string[] | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!options?.length) return PrismaClient.JsonNull;
  return options as Prisma.InputJsonValue;
}

export type AdminMemberSportTemplateListItem = {
  id: string;
  code: string;
  name: string;
  sportType: string;
  active: boolean;
  fieldCount: number;
  gymCount: number;
  updatedAt: Date;
};

export const memberSportTemplateAdminService = {
  async listTemplates(
    actor: ActorContext,
  ): Promise<AdminMemberSportTemplateListItem[]> {
    requireAdmin(actor);
    const rows = await memberSportTemplateRepository.listAll();
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      sportType: row.sportType,
      active: row.active,
      fieldCount: row._count.fields,
      gymCount: row._count.gyms,
      updatedAt: row.updatedAt,
    }));
  },

  async getTemplate(actor: ActorContext, templateId: string) {
    requireAdmin(actor);
    const row = await memberSportTemplateRepository.findById(templateId);
    if (!row) {
      throw new AppError("NOT_FOUND", "템플릿을 찾을 수 없습니다.");
    }
    return {
      ...memberSportTemplateRepository.mapWithAllFields(row),
      gymCount: row._count.gyms,
      updatedAt: row.updatedAt,
    };
  },

  async createTemplate(
    actor: ActorContext,
    input: { code: string; name: string; sportType: string },
  ) {
    requireAdmin(actor);
    const codeResult = validateMemberSportTemplateCode(input.code);
    if (!codeResult.ok) {
      throw new AppError("VALIDATION_ERROR", codeResult.message);
    }
    const name = input.name.trim();
    const sportType = input.sportType.trim() || codeResult.code;
    if (!name) {
      throw new AppError("VALIDATION_ERROR", "템플릿명을 입력해 주세요.");
    }

    const existing = await memberSportTemplateRepository.findByCode(
      codeResult.code,
    );
    if (existing) {
      throw new AppError(
        "CONFLICT",
        `이미 존재하는 종목 코드입니다: ${codeResult.code}`,
      );
    }

    return memberSportTemplateRepository.create({
      code: codeResult.code,
      name,
      sportType,
      active: true,
      version: 1,
    });
  },

  async updateTemplateMeta(
    actor: ActorContext,
    templateId: string,
    input: { name?: string; sportType?: string; active?: boolean },
  ) {
    requireAdmin(actor);
    const row = await memberSportTemplateRepository.findById(templateId);
    if (!row) {
      throw new AppError("NOT_FOUND", "템플릿을 찾을 수 없습니다.");
    }
    if (input.active === false && row._count.gyms > 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "체육관에서 사용 중인 템플릿은 비활성화할 수 없습니다. 먼저 연결을 해제하세요.",
      );
    }
    return memberSportTemplateRepository.update(templateId, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.sportType !== undefined
        ? { sportType: input.sportType.trim() }
        : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    });
  },

  async deleteTemplate(actor: ActorContext, templateId: string) {
    requireAdmin(actor);
    const row = await memberSportTemplateRepository.findById(templateId);
    if (!row) {
      throw new AppError("NOT_FOUND", "템플릿을 찾을 수 없습니다.");
    }
    if (row._count.gyms > 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "체육관에서 사용 중인 템플릿은 삭제할 수 없습니다.",
      );
    }

    for (const field of row.fields) {
      const count =
        await memberSportTemplateFieldRepository.countValues(field.id);
      if (count > 0) {
        throw new AppError(
          "VALIDATION_ERROR",
          "회원 값이 남아 있는 필드가 있어 템플릿을 삭제할 수 없습니다. 필드를 비활성화하세요.",
        );
      }
    }

    await prisma.memberSportTemplateField.deleteMany({
      where: { templateId },
    });
    await prisma.memberSportTemplate.delete({ where: { id: templateId } });
  },

  async duplicateTemplate(actor: ActorContext, templateId: string) {
    requireAdmin(actor);
    const source = await memberSportTemplateRepository.findById(templateId);
    if (!source) {
      throw new AppError("NOT_FOUND", "템플릿을 찾을 수 없습니다.");
    }

    let nextCode = `${source.code}_COPY`;
    let attempt = 1;
    while (await memberSportTemplateRepository.findByCode(nextCode)) {
      attempt += 1;
      nextCode = `${source.code}_COPY${attempt}`;
      if (attempt > 20) {
        throw new AppError(
          "VALIDATION_ERROR",
          "복제용 종목 코드를 생성할 수 없습니다.",
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      const created = await tx.memberSportTemplate.create({
        data: {
          code: nextCode,
          name: `${source.name} (복제)`,
          sportType: source.sportType,
          active: false,
          version: 1,
        },
      });
      for (const field of source.fields) {
        await tx.memberSportTemplateField.create({
          data: {
            templateId: created.id,
            stableKey: field.stableKey,
            label: field.label,
            type: field.type,
            required: field.required,
            placeholder: field.placeholder,
            helpText: field.helpText,
            optionsJson: field.optionsJson ?? PrismaClient.JsonNull,
            displayOrder: field.displayOrder,
            active: field.active,
          },
        });
      }
      return created;
    });
  },

  async saveFields(
    actor: ActorContext,
    templateId: string,
    fields: GymMemberDynamicFieldDefinition[],
  ) {
    requireAdmin(actor);
    const template = await memberSportTemplateRepository.findById(templateId);
    if (!template) {
      throw new AppError("NOT_FOUND", "템플릿을 찾을 수 없습니다.");
    }

    const normalized = normalizeGymMemberDynamicFields(fields);
    const validationError =
      validateGymMemberDynamicFieldDefinitions(normalized);
    if (validationError) {
      throw new AppError("VALIDATION_ERROR", validationError);
    }

    const existingByKey = new Map(
      template.fields.map((f) => [f.stableKey, f]),
    );
    const incomingKeys = new Set(normalized.map((f) => f.stableKey));

    for (const field of normalized) {
      const prev = existingByKey.get(field.stableKey);
      if (!prev || prev.type === field.type) continue;
      const valueCount =
        await memberSportTemplateFieldRepository.countValues(prev.id);
      if (valueCount > 0) {
        const msg = assertCompatibleGymMemberFieldTypeChange(
          prev.type,
          field.type,
        );
        if (msg) throw new AppError("VALIDATION_ERROR", msg);
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const field of normalized) {
        const prev = existingByKey.get(field.stableKey);
        const data = {
          label: field.label,
          type: field.type,
          required: field.required === true,
          placeholder: field.placeholder ?? null,
          helpText: field.helpText ?? null,
          optionsJson: optionsToJson(field.options),
          displayOrder: field.displayOrder ?? 0,
          active: field.active !== false,
        };
        if (prev) {
          await memberSportTemplateFieldRepository.update(prev.id, data, tx);
        } else {
          await memberSportTemplateFieldRepository.create(
            {
              template: { connect: { id: templateId } },
              stableKey: field.stableKey,
              ...data,
            },
            tx,
          );
        }
      }

      for (const row of template.fields) {
        if (!incomingKeys.has(row.stableKey) && row.active) {
          const valueCount =
            await memberSportTemplateFieldRepository.countValues(row.id);
          if (valueCount > 0) {
            await memberSportTemplateFieldRepository.update(
              row.id,
              { active: false },
              tx,
            );
          } else {
            await memberSportTemplateFieldRepository.delete(row.id, tx);
          }
        }
      }
    });
  },

  async deleteField(actor: ActorContext, fieldId: string) {
    requireAdmin(actor);
    const field = await prisma.memberSportTemplateField.findUnique({
      where: { id: fieldId },
    });
    if (!field) {
      throw new AppError("NOT_FOUND", "필드를 찾을 수 없습니다.");
    }
    const valueCount =
      await memberSportTemplateFieldRepository.countValues(field.id);
    if (valueCount > 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "이 항목에는 저장된 회원 정보가 있어 바로 삭제할 수 없습니다. 비활성화하세요.",
        { code: "VALUE_EXISTS", valueCount },
      );
    }
    await memberSportTemplateFieldRepository.delete(field.id);
  },

  suggestFieldKey(label: string, existingKeys: string[]) {
    return suggestGymMemberCustomFieldKey(label, new Set(existingKeys));
  },
};
