import "server-only";

import type { Prisma } from "@/generated/prisma";
import { GymMemberProfileValueSource } from "@/lib/enums";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  requireGymPortalRead,
  requireGymPortalWrite,
} from "@/lib/gym-portal-access";
import type { GymMemberDynamicFieldDefinition } from "@/lib/gym-member-profile/fields";
import {
  gymMemberProfileValueToJson,
  parseGymMemberProfileValueFromForm,
  validateGymMemberProfileValue,
} from "@/lib/gym-member-profile/values";
import {
  gymProfileFormName,
  sportProfileFormName,
} from "@/lib/gym-member-profile/form-names";
import { prisma } from "@/lib/prisma";
import {
  gymMemberCustomFieldRepository,
  gymMemberProfileValueRepository,
  memberSportTemplateRepository,
} from "@/lib/repositories/gym-member-profile.repository";
import {
  KICKBOXING_TEMPLATE_ID,
  type MemberSportTemplateWithFields,
} from "@/lib/gym-member-profile/types";

export { KICKBOXING_TEMPLATE_ID };
export type { MemberSportTemplateWithFields };

export type GymMemberProfileFormContext = {
  sportTemplate: MemberSportTemplateWithFields | null;
  customFields: GymMemberDynamicFieldDefinition[];
  sportValues: Record<string, unknown>;
  gymValues: Record<string, unknown>;
};

export { sportProfileFormName, gymProfileFormName } from "@/lib/gym-member-profile/form-names";

export const gymMemberProfileService = {
  async getGymFormContext(
    actor: ActorContext,
  ): Promise<{
    sportTemplate: MemberSportTemplateWithFields | null;
    customFields: GymMemberDynamicFieldDefinition[];
  }> {
    const access = await requireGymPortalRead(actor);
    const gym = await prisma.gym.findUnique({
      where: { id: access.gymId },
      select: { memberSportTemplateId: true },
    });
    if (!gym) {
      throw new AppError("NOT_FOUND", "체육관을 찾을 수 없습니다.");
    }

    let sportTemplate: MemberSportTemplateWithFields | null = null;
    if (gym.memberSportTemplateId) {
      const row = await memberSportTemplateRepository.findById(
        gym.memberSportTemplateId,
      );
      if (row?.active) {
        sportTemplate = memberSportTemplateRepository.mapWithActiveFields(row);
      }
    }

    const customRows = await gymMemberCustomFieldRepository.listForGym(
      access.gymId,
      false,
    );
    const customFields = customRows.map(gymMemberCustomFieldRepository.mapField);

    return { sportTemplate, customFields };
  },

  async getMemberProfileContext(
    actor: ActorContext,
    memberId: string,
  ): Promise<GymMemberProfileFormContext> {
    const access = await requireGymPortalRead(actor);
    const [formCtx, valueRows] = await Promise.all([
      gymMemberProfileService.getGymFormContext(actor),
      gymMemberProfileValueRepository.listForMember(memberId),
    ]);

    const sportValues: Record<string, unknown> = {};
    const gymValues: Record<string, unknown> = {};
    for (const row of valueRows) {
      if (row.sourceType === GymMemberProfileValueSource.SPORT) {
        sportValues[row.stableKey] = row.valueJson;
      } else {
        gymValues[row.stableKey] = row.valueJson;
      }
    }

    return {
      sportTemplate: formCtx.sportTemplate,
      customFields: formCtx.customFields,
      sportValues,
      gymValues,
    };
  },

  parseProfileValuesFromFormData(
    formData: FormData,
    sportFields: GymMemberDynamicFieldDefinition[],
    gymFields: GymMemberDynamicFieldDefinition[],
  ): {
    sportRows: Array<{
      stableKey: string;
      valueJson: unknown;
      sportTemplateFieldId?: string;
    }>;
    gymRows: Array<{
      stableKey: string;
      valueJson: unknown;
      gymCustomFieldId?: string;
    }>;
    errors: string[];
  } {
    const errors: string[] = [];
    const sportRows: Array<{
      stableKey: string;
      valueJson: unknown;
      sportTemplateFieldId?: string;
    }> = [];
    const gymRows: Array<{
      stableKey: string;
      valueJson: unknown;
      gymCustomFieldId?: string;
    }> = [];

    for (const field of sportFields) {
      const raw = formData.get(sportProfileFormName(field.stableKey));
      const parsed = parseGymMemberProfileValueFromForm(raw, field.type);
      const err = validateGymMemberProfileValue(field, parsed);
      if (err) errors.push(err);
      sportRows.push({
        stableKey: field.stableKey,
        valueJson: gymMemberProfileValueToJson(parsed),
        sportTemplateFieldId: field.id,
      });
    }

    for (const field of gymFields) {
      const raw = formData.get(gymProfileFormName(field.stableKey));
      const parsed = parseGymMemberProfileValueFromForm(raw, field.type);
      const err = validateGymMemberProfileValue(field, parsed);
      if (err) errors.push(err);
      gymRows.push({
        stableKey: field.stableKey,
        valueJson: gymMemberProfileValueToJson(parsed),
        gymCustomFieldId: field.id,
      });
    }

    return { sportRows, gymRows, errors };
  },

  async saveProfileValuesForMember(
    gymMemberId: string,
    sportRows: Array<{
      stableKey: string;
      valueJson: unknown;
      sportTemplateFieldId?: string | null;
    }>,
    gymRows: Array<{
      stableKey: string;
      valueJson: unknown;
      gymCustomFieldId?: string | null;
    }>,
    tx?: Prisma.TransactionClient,
  ) {
    await gymMemberProfileValueRepository.upsertMany(
      gymMemberId,
      [
        ...sportRows.map((r) => ({
          sourceType: GymMemberProfileValueSource.SPORT,
          stableKey: r.stableKey,
          valueJson: r.valueJson,
          sportTemplateFieldId: r.sportTemplateFieldId ?? null,
        })),
        ...gymRows.map((r) => ({
          sourceType: GymMemberProfileValueSource.GYM,
          stableKey: r.stableKey,
          valueJson: r.valueJson,
          gymCustomFieldId: r.gymCustomFieldId ?? null,
        })),
      ],
      tx,
    );
  },

  async enableKickboxingTemplate(actor: ActorContext) {
    const access = await requireGymPortalWrite(actor);
    const template = await memberSportTemplateRepository.findByCode("KICKBOXING");
    if (!template?.active) {
      throw new AppError("NOT_FOUND", "킥복싱 템플릿을 찾을 수 없습니다.");
    }
    await prisma.gym.update({
      where: { id: access.gymId },
      data: { memberSportTemplateId: template.id },
    });
    return { templateId: template.id };
  },

  async assignKickboxingTemplateByGymId(gymId: string) {
    await prisma.gym.update({
      where: { id: gymId },
      data: { memberSportTemplateId: KICKBOXING_TEMPLATE_ID },
    });
  },
};
