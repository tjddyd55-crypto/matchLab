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
  sportProfileFormNameForTemplate,
} from "@/lib/gym-member-profile/form-names";
import { dedupeTemplateIds } from "@/lib/gym-member-profile/multi-sport";
import { prisma } from "@/lib/prisma";
import {
  gymMemberCustomFieldRepository,
  gymMemberProfileValueRepository,
  memberSportTemplateRepository,
} from "@/lib/repositories/gym-member-profile.repository";
import {
  gymMemberSportTemplateAssignmentRepository,
  gymSportTemplateAssignmentRepository,
  resolveGymActiveSportTemplates,
} from "@/lib/repositories/gym-sport-template.repository";
import {
  KICKBOXING_TEMPLATE_ID,
  type MemberSportTemplateWithFields,
} from "@/lib/gym-member-profile/types";

export { KICKBOXING_TEMPLATE_ID };
export type { MemberSportTemplateWithFields };

export type GymMemberProfileFormContext = {
  /** @deprecated use sportTemplates */
  sportTemplate: MemberSportTemplateWithFields | null;
  sportTemplates: MemberSportTemplateWithFields[];
  customFields: GymMemberDynamicFieldDefinition[];
  /** Values keyed by `${templateId}::${stableKey}` for sport */
  sportValuesByTemplate: Record<string, Record<string, unknown>>;
  /** Flat sport values (first template / legacy) */
  sportValues: Record<string, unknown>;
  gymValues: Record<string, unknown>;
  memberActiveTemplateIds: string[];
};

export {
  sportProfileFormName,
  sportProfileFormNameForTemplate,
  gymProfileFormName,
} from "@/lib/gym-member-profile/form-names";

function sportValueBucketKey(templateId: string) {
  return templateId;
}

export const gymMemberProfileService = {
  async getGymFormContext(actor: ActorContext): Promise<{
    sportTemplate: MemberSportTemplateWithFields | null;
    sportTemplates: MemberSportTemplateWithFields[];
    customFields: GymMemberDynamicFieldDefinition[];
  }> {
    const access = await requireGymPortalRead(actor);
    const sportTemplates = await resolveGymActiveSportTemplates(access.gymId);
    const customRows = await gymMemberCustomFieldRepository.listForGym(
      access.gymId,
      false,
    );
    const customFields = customRows.map(gymMemberCustomFieldRepository.mapField);

    return {
      sportTemplate: sportTemplates[0] ?? null,
      sportTemplates,
      customFields,
    };
  },

  async getMemberProfileContext(
    actor: ActorContext,
    memberId: string,
  ): Promise<GymMemberProfileFormContext> {
    const access = await requireGymPortalRead(actor);
    const [formCtx, valueRows, memberAssignments] = await Promise.all([
      gymMemberProfileService.getGymFormContext(actor),
      gymMemberProfileValueRepository.listForMember(memberId),
      gymMemberSportTemplateAssignmentRepository.listForMember(memberId),
    ]);

    const activeIds = new Set(
      memberAssignments.filter((a) => a.isActive).map((a) => a.templateId),
    );

    // Explicit active assignments → those templates (gym-active only).
    // No assignment rows → legacy compatibility: show gym active templates.
    const sportTemplates =
      activeIds.size > 0
        ? formCtx.sportTemplates.filter((t) => activeIds.has(t.id))
        : formCtx.sportTemplates;

    const sportValuesByTemplate: Record<string, Record<string, unknown>> = {};
    const sportValues: Record<string, unknown> = {};
    const gymValues: Record<string, unknown> = {};

    const fieldToTemplate = new Map<string, string>();
    for (const t of formCtx.sportTemplates) {
      for (const f of t.fields) {
        if (f.id) fieldToTemplate.set(f.id, t.id);
      }
    }
    for (const a of memberAssignments) {
      const mapped = memberSportTemplateRepository.mapWithActiveFields(
        a.template,
      );
      for (const f of mapped.fields) {
        if (f.id) fieldToTemplate.set(f.id, mapped.id);
      }
      if (!sportValuesByTemplate[mapped.id]) {
        sportValuesByTemplate[mapped.id] = {};
      }
    }

    for (const row of valueRows) {
      if (row.sourceType === GymMemberProfileValueSource.SPORT) {
        const templateId =
          (row.sportTemplateFieldId &&
            fieldToTemplate.get(row.sportTemplateFieldId)) ||
          sportTemplates[0]?.id ||
          null;
        if (templateId) {
          const bucket =
            sportValuesByTemplate[sportValueBucketKey(templateId)] ??
            (sportValuesByTemplate[sportValueBucketKey(templateId)] = {});
          bucket[row.stableKey] = row.valueJson;
        }
        sportValues[row.stableKey] = row.valueJson;
      } else {
        gymValues[row.stableKey] = row.valueJson;
      }
    }

    return {
      sportTemplate: sportTemplates[0] ?? null,
      sportTemplates,
      customFields: formCtx.customFields,
      sportValuesByTemplate,
      sportValues,
      gymValues,
      memberActiveTemplateIds: [...activeIds],
    };
  },

  parseProfileValuesFromFormData(
    formData: FormData,
    sportTemplates: MemberSportTemplateWithFields[],
    gymFields: GymMemberDynamicFieldDefinition[],
  ): {
    sportRows: Array<{
      stableKey: string;
      valueJson: unknown;
      sportTemplateFieldId?: string;
      templateId: string;
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
      templateId: string;
    }> = [];
    const gymRows: Array<{
      stableKey: string;
      valueJson: unknown;
      gymCustomFieldId?: string;
    }> = [];

    for (const template of sportTemplates) {
      for (const field of template.fields) {
        const raw = formData.get(
          sportProfileFormNameForTemplate(template.id, field.stableKey),
        );
        const parsed = parseGymMemberProfileValueFromForm(raw, field.type);
        const err = validateGymMemberProfileValue(field, parsed);
        if (err) errors.push(`[${template.name}] ${err}`);
        sportRows.push({
          stableKey: field.stableKey,
          valueJson: gymMemberProfileValueToJson(parsed),
          sportTemplateFieldId: field.id,
          templateId: template.id,
        });
      }
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

  parseMemberSportTemplateIdsFromFormData(formData: FormData): string[] {
    return dedupeTemplateIds(
      formData
        .getAll("memberSportTemplateIds")
        .filter((v): v is string => typeof v === "string"),
    );
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

  async syncMemberSportTemplates(
    gymMemberId: string,
    templateIds: string[],
    gymId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const allowed = await resolveGymActiveSportTemplates(gymId);
    const allowedIds = new Set(allowed.map((t) => t.id));
    const ids = dedupeTemplateIds(templateIds);
    for (const id of ids) {
      if (!allowedIds.has(id)) {
        throw new AppError(
          "VALIDATION_ERROR",
          "체육관에서 사용하지 않는 종목이 포함되어 있습니다.",
        );
      }
    }
    return gymMemberSportTemplateAssignmentRepository.syncActive(
      gymMemberId,
      ids,
      tx,
    );
  },

  async listAssignableTemplatesForGym(actor: ActorContext) {
    const access = await requireGymPortalRead(actor);
    const [activeGym, allActive] = await Promise.all([
      gymSportTemplateAssignmentRepository.listForGym(access.gymId),
      memberSportTemplateRepository.listActive(),
    ]);
    const assigned = new Map(
      activeGym.map((a) => [a.templateId, a] as const),
    );
    return allActive.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      sportType: t.sportType,
      assigned: assigned.has(t.id),
      isActive: assigned.get(t.id)?.isActive ?? false,
    }));
  },

  async saveGymSportTemplateAssignments(
    actor: ActorContext,
    input: { templateIds: string[] },
  ) {
    const access = await requireGymPortalWrite(actor);
    const ids = dedupeTemplateIds(input.templateIds);

    const activeTemplates = await memberSportTemplateRepository.listActive();
    const activeById = new Map(activeTemplates.map((t) => [t.id, t]));
    for (const id of ids) {
      if (!activeById.has(id)) {
        throw new AppError(
          "VALIDATION_ERROR",
          "비활성 또는 존재하지 않는 종목은 추가할 수 없습니다.",
        );
      }
    }

    const existing = await gymSportTemplateAssignmentRepository.listForGym(
      access.gymId,
    );

    await prisma.$transaction(async (tx) => {
      for (const id of ids) {
        await gymSportTemplateAssignmentRepository.upsertActive(
          access.gymId,
          id,
          tx,
        );
      }

      for (const row of existing) {
        if (ids.includes(row.templateId)) continue;
        if (!row.isActive) continue;

        const valueCount = await tx.gymMemberProfileValue.count({
          where: {
            sourceType: "SPORT",
            sportTemplateField: { templateId: row.templateId },
            gymMember: { gymId: access.gymId },
          },
        });
        if (valueCount > 0) {
          await gymSportTemplateAssignmentRepository.setActive(
            access.gymId,
            row.templateId,
            false,
            tx,
          );
          continue;
        }
        await gymSportTemplateAssignmentRepository.setActive(
          access.gymId,
          row.templateId,
          false,
          tx,
        );
      }

      // Keep legacy FK pointing at first active assignment for compatibility
      const first = ids[0] ?? null;
      await tx.gym.update({
        where: { id: access.gymId },
        data: { memberSportTemplateId: first },
      });
    });

    return { templateIds: ids };
  },

  async enableKickboxingTemplate(actor: ActorContext) {
    const access = await requireGymPortalWrite(actor);
    const template = await memberSportTemplateRepository.findByCode("KICKBOXING");
    if (!template?.active) {
      throw new AppError("NOT_FOUND", "킥복싱 템플릿을 찾을 수 없습니다.");
    }
    await prisma.$transaction(async (tx) => {
      await gymSportTemplateAssignmentRepository.upsertActive(
        access.gymId,
        template.id,
        tx,
      );
      await tx.gym.update({
        where: { id: access.gymId },
        data: { memberSportTemplateId: template.id },
      });
    });
    return { templateId: template.id };
  },

  async assignKickboxingTemplateByGymId(gymId: string) {
    await prisma.$transaction(async (tx) => {
      await gymSportTemplateAssignmentRepository.upsertActive(
        gymId,
        KICKBOXING_TEMPLATE_ID,
        tx,
      );
      await tx.gym.update({
        where: { id: gymId },
        data: { memberSportTemplateId: KICKBOXING_TEMPLATE_ID },
      });
    });
  },
};
