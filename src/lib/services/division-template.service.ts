import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { divisionTemplateRepository } from "@/lib/repositories/division-template.repository";
import { eventRepository } from "@/lib/repositories/event.repository";
import type {
  ApplyDivisionTemplateInput,
  CreateDivisionTemplateInput,
  DivisionTemplateItemInput,
  UpdateDivisionTemplateInput,
} from "@/lib/validators/division-template.validator";

function resolveOrganizerId(actor: ActorContext, inputOrganizerId?: string) {
  if (actor.role === "admin") {
    const id = inputOrganizerId?.trim();
    if (!id) throw new AppError("VALIDATION_ERROR", "organizerId가 필요합니다.");
    return id;
  }
  if (!actor.organizerId) {
    throw new AppError("FORBIDDEN", "주최자 정보가 없습니다.");
  }
  return actor.organizerId;
}

function assertTemplateOwned(
  actor: ActorContext,
  templateOrganizerId: string,
): void {
  if (actor.role === "admin") return;
  if (!actor.organizerId || templateOrganizerId !== actor.organizerId) {
    throw new AppError("FORBIDDEN", "이 템플릿에 접근할 수 없습니다.");
  }
}

function normalizeDivisionKey(d: DivisionTemplateItemInput): string {
  return JSON.stringify({
    sportType: d.sportType.trim(),
    ruleType: d.ruleType?.trim() || "",
    gender: d.gender?.trim() || "",
    ageGroup: d.ageGroup?.trim() || "",
    weightClass: d.weightClass?.trim() || "",
    skillLevel: d.skillLevel?.trim() || "",
  });
}

function parseTemplateItemsFromJson(
  rawItems: unknown,
): DivisionTemplateItemInput[] {
  if (!Array.isArray(rawItems)) return [];
  const out: DivisionTemplateItemInput[] = [];
  for (const item of rawItems) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const sportType = typeof o.sportType === "string" ? o.sportType : "";
    if (!sportType.trim()) continue;
    out.push({
      sportType,
      ruleType: typeof o.ruleType === "string" ? o.ruleType : null,
      gender: typeof o.gender === "string" ? o.gender : null,
      ageGroup: typeof o.ageGroup === "string" ? o.ageGroup : null,
      weightClass:
        typeof o.weightClass === "string" ? o.weightClass : null,
      skillLevel:
        typeof o.skillLevel === "string" ? o.skillLevel : null,
    });
  }
  return out;
}

export type DivisionTemplateListItemVM = {
  id: string;
  title: string;
  sportType: string | null;
  description: string | null;
  itemCount: number;
  updatedAt: string;
};

export type DivisionTemplateDetailVM = {
  id: string;
  title: string;
  sportType: string | null;
  description: string | null;
  items: DivisionTemplateItemInput[];
  updatedAt: string;
};

export const divisionTemplateService = {
  async listTemplatesDetailed(
    actor: ActorContext,
    organizerIdInput?: string,
  ): Promise<DivisionTemplateDetailVM[]> {
    requireRole(actor, ["organizer", "admin"]);
    const organizerId = resolveOrganizerId(actor, organizerIdInput);
    const rows = await divisionTemplateRepository.listByOrganizer(organizerId);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      sportType: r.sportType,
      description: r.description,
      items: parseTemplateItemsFromJson(r.items),
      updatedAt: r.updatedAt.toISOString(),
    }));
  },

  async listTemplates(
    actor: ActorContext,
    organizerIdInput?: string,
  ): Promise<DivisionTemplateListItemVM[]> {
    requireRole(actor, ["organizer", "admin"]);
    const organizerId = resolveOrganizerId(actor, organizerIdInput);
    const rows = await divisionTemplateRepository.listByOrganizer(organizerId);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      sportType: r.sportType,
      description: r.description,
      itemCount: Array.isArray(r.items) ? r.items.length : 0,
      updatedAt: r.updatedAt.toISOString(),
    }));
  },

  async createTemplate(
    actor: ActorContext,
    input: CreateDivisionTemplateInput,
  ): Promise<{ templateId: string }> {
    requireRole(actor, ["organizer", "admin"]);
    const organizerId = resolveOrganizerId(actor, input.organizerId);
    const row = await divisionTemplateRepository.create({
      organizerId,
      title: input.title,
      sportType: input.sportType ?? null,
      description: input.description ?? null,
      items: input.items,
    });
    return { templateId: row.id };
  },

  async updateTemplate(
    actor: ActorContext,
    input: UpdateDivisionTemplateInput,
  ): Promise<void> {
    requireRole(actor, ["organizer", "admin"]);
    const existing = await divisionTemplateRepository.findById(
      input.templateId,
    );
    if (!existing) {
      throw new AppError("NOT_FOUND", "템플릿을 찾을 수 없습니다.");
    }
    assertTemplateOwned(actor, existing.organizerId);
    await divisionTemplateRepository.update(input.templateId, {
      title: input.title,
      sportType: input.sportType,
      description: input.description,
      items: input.items,
    });
  },

  async deleteTemplate(actor: ActorContext, templateId: string): Promise<void> {
    requireRole(actor, ["organizer", "admin"]);
    const existing = await divisionTemplateRepository.findById(templateId);
    if (!existing) {
      throw new AppError("NOT_FOUND", "템플릿을 찾을 수 없습니다.");
    }
    assertTemplateOwned(actor, existing.organizerId);
    await divisionTemplateRepository.delete(templateId);
  },

  async applyTemplateToEvent(
    actor: ActorContext,
    input: ApplyDivisionTemplateInput,
  ): Promise<{ created: number; skippedDuplicates: number }> {
    await requireOrganizerForEvent(actor, input.eventId);

    const tpl = await divisionTemplateRepository.findById(input.templateId);
    if (!tpl) {
      throw new AppError("NOT_FOUND", "템플릿을 찾을 수 없습니다.");
    }

    const eventRow = await eventRepository.findOrganizerEventById(input.eventId);
    if (!eventRow || eventRow.organizerId !== tpl.organizerId) {
      throw new AppError(
        "FORBIDDEN",
        "다른 주최자의 템플릿은 이 대회에 적용할 수 없습니다.",
      );
    }

    const parsedItems = parseTemplateItemsFromJson(tpl.items);
    if (parsedItems.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "템플릿에 적용 가능한 부문 항목이 없습니다.",
      );
    }

    const existingDivisions = await eventRepository.listEventDivisions(
      input.eventId,
    );
    const existingKeys = new Set(
      existingDivisions.map((d) =>
        normalizeDivisionKey({
          sportType: d.sportType,
          ruleType: d.ruleType,
          gender: d.gender,
          ageGroup: d.ageGroup,
          weightClass: d.weightClass,
          skillLevel: d.skillLevel,
        }),
      ),
    );

    let created = 0;
    let skippedDuplicates = 0;

    for (const normalized of parsedItems) {
      const key = normalizeDivisionKey(normalized);
      if (existingKeys.has(key)) {
        skippedDuplicates += 1;
        continue;
      }

      existingKeys.add(key);

      await eventRepository.createEventDivision({
        event: { connect: { id: input.eventId } },
        sportType: normalized.sportType.trim(),
        ruleType: normalized.ruleType?.trim() || null,
        gender: normalized.gender?.trim() || null,
        ageGroup: normalized.ageGroup?.trim() || null,
        weightClass: normalized.weightClass?.trim() || null,
        skillLevel: normalized.skillLevel?.trim() || null,
      });
      created += 1;
    }

    return { created, skippedDuplicates };
  },
};
