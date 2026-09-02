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
};
