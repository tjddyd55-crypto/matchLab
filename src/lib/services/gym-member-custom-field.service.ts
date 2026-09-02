import "server-only";

import type { Prisma } from "@/generated/prisma";
import { Prisma as PrismaClient } from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  requireGymPortalRead,
  requireGymPortalWrite,
} from "@/lib/gym-portal-access";
import {
  normalizeGymMemberDynamicFields,
  validateGymMemberDynamicFieldDefinitions,
  type GymMemberDynamicFieldDefinition,
} from "@/lib/gym-member-profile/fields";
import { assertCompatibleGymMemberFieldTypeChange } from "@/lib/gym-member-profile/type-change";
import { gymMemberCustomFieldRepository } from "@/lib/repositories/gym-member-profile.repository";
import { prisma } from "@/lib/prisma";

function optionsToJson(
  options: string[] | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!options?.length) return PrismaClient.JsonNull;
  return options as Prisma.InputJsonValue;
}

export const gymMemberCustomFieldService = {
  async listFields(
    actor: ActorContext,
    includeInactive = false,
  ): Promise<GymMemberDynamicFieldDefinition[]> {
    const access = await requireGymPortalRead(actor);
    const rows = await gymMemberCustomFieldRepository.listForGym(
      access.gymId,
      includeInactive,
    );
    return rows.map(gymMemberCustomFieldRepository.mapField);
  },

  async getValueUsageMap(
    actor: ActorContext,
  ): Promise<Record<string, number>> {
    const access = await requireGymPortalRead(actor);
    const rows = await gymMemberCustomFieldRepository.listForGym(
      access.gymId,
      true,
    );
    const usage: Record<string, number> = {};
    for (const row of rows) {
      usage[row.stableKey] =
        await gymMemberCustomFieldRepository.countValues(row.id);
    }
    return usage;
  },

  async saveFields(
    actor: ActorContext,
    fields: GymMemberDynamicFieldDefinition[],
  ) {
    const access = await requireGymPortalWrite(actor);
    const normalized = normalizeGymMemberDynamicFields(fields);
    const validationError = validateGymMemberDynamicFieldDefinitions(normalized);
    if (validationError) {
      throw new AppError("VALIDATION_ERROR", validationError);
    }

    const existing = await gymMemberCustomFieldRepository.listForGym(
      access.gymId,
      true,
    );
    const existingByKey = new Map(existing.map((r) => [r.stableKey, r]));
    const incomingKeys = new Set(normalized.map((f) => f.stableKey));

    for (const field of normalized) {
      const prev = existingByKey.get(field.stableKey);
      if (!prev || prev.type === field.type) continue;
      const valueCount =
        await gymMemberCustomFieldRepository.countValues(prev.id);
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
          await gymMemberCustomFieldRepository.update(prev.id, data, tx);
        } else {
          await gymMemberCustomFieldRepository.create(
            {
              gym: { connect: { id: access.gymId } },
              stableKey: field.stableKey,
              ...data,
            },
            tx,
          );
        }
      }

      for (const row of existing) {
        if (!incomingKeys.has(row.stableKey) && row.active) {
          await gymMemberCustomFieldRepository.update(
            row.id,
            { active: false },
            tx,
          );
        }
      }
    });
  },

  /**
   * Hard delete only when no member values exist.
   * Value-holding fields must be deactivated instead.
   */
  async deleteField(actor: ActorContext, fieldId: string) {
    const access = await requireGymPortalWrite(actor);
    const row = await gymMemberCustomFieldRepository.findByIdForGym(
      fieldId,
      access.gymId,
    );
    if (!row) {
      throw new AppError("NOT_FOUND", "항목을 찾을 수 없습니다.");
    }

    const valueCount =
      await gymMemberCustomFieldRepository.countValues(row.id);
    if (valueCount > 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "이 항목에는 저장된 회원 정보가 있어 바로 삭제할 수 없습니다. 비활성화하면 기존 정보는 보존되고 신규 입력 화면에서는 숨겨집니다.",
        { code: "VALUE_EXISTS", valueCount },
      );
    }

    await gymMemberCustomFieldRepository.delete(row.id);
  },

  async setFieldActive(
    actor: ActorContext,
    fieldId: string,
    active: boolean,
  ) {
    const access = await requireGymPortalWrite(actor);
    const row = await gymMemberCustomFieldRepository.findByIdForGym(
      fieldId,
      access.gymId,
    );
    if (!row) {
      throw new AppError("NOT_FOUND", "항목을 찾을 수 없습니다.");
    }
    await gymMemberCustomFieldRepository.update(row.id, { active });
  },
};
