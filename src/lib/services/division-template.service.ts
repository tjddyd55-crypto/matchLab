import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import {
  divisionTemplateRepository,
  type DivisionTemplateListRow,
} from "@/lib/repositories/division-template.repository";
import { eventRepository } from "@/lib/repositories/event.repository";
import type {
  ApplyDivisionTemplateInput,
  CreateDivisionTemplateInput,
  DivisionTemplateItemInput,
  UpdateDivisionTemplateInput,
} from "@/lib/validators/division-template.validator";
import {
  buildWeightClassDisplay,
  itemToEventDivisionRow,
  normalizeEventDivisionKey,
  sortTemplateItems,
} from "@/lib/division-template/division-template-row";

function resolveOrganizerIdForWrite(
  actor: ActorContext,
  inputOrganizerId?: string,
) {
  if (actor.role === "admin") {
    const id = inputOrganizerId?.trim();
    if (!id) {
      throw new AppError(
        "VALIDATION_ERROR",
        "템플릿을 저장하려면 주최자(organizerId)를 지정해 주세요.",
      );
    }
    return id;
  }
  if (!actor.organizerId) {
    throw new AppError(
      "FORBIDDEN",
      "주최자 프로필이 없습니다. 관리자에게 계정 연결을 요청해 주세요.",
    );
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

async function listTemplateRows(
  actor: ActorContext,
  options?: { organizerId?: string },
): Promise<DivisionTemplateListRow[]> {
  requireRole(actor, ["organizer", "admin"]);

  if (actor.role === "admin") {
    const filterId = options?.organizerId?.trim();
    return divisionTemplateRepository.list(
      filterId ? { organizerId: filterId } : undefined,
    );
  }

  if (!actor.organizerId) {
    throw new AppError(
      "FORBIDDEN",
      "주최자 프로필이 없습니다. 관리자에게 계정 연결을 요청해 주세요.",
    );
  }

  return divisionTemplateRepository.list({ organizerId: actor.organizerId });
}

function parseTemplateItemsFromJson(
  rawItems: unknown,
  templateSportType?: string | null,
): DivisionTemplateItemInput[] {
  if (!Array.isArray(rawItems)) return [];
  const sportFallback = templateSportType?.trim() || "";
  const out: DivisionTemplateItemInput[] = [];

  for (const item of rawItems) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const sportType =
      typeof o.sportType === "string" && o.sportType.trim()
        ? o.sportType
        : sportFallback;
    if (!sportType.trim()) continue;

    const weightClassName =
      typeof o.weightClassName === "string" ? o.weightClassName : null;
    const weightLimitText =
      typeof o.weightLimitText === "string" ? o.weightLimitText : null;
    const legacyWeightClass =
      typeof o.weightClass === "string" ? o.weightClass : null;
    const weightClass =
      legacyWeightClass?.trim() ||
      [weightClassName, weightLimitText].filter(Boolean).join(" ").trim() ||
      null;

    if (!weightClass && o.isActive !== false) continue;

    out.push({
      sportType,
      ruleType: typeof o.ruleType === "string" ? o.ruleType : null,
      gender: typeof o.gender === "string" ? o.gender : null,
      ageGroup: typeof o.ageGroup === "string" ? o.ageGroup : null,
      weightClass,
      weightClassName,
      weightLimitText,
      weightLimitKg:
        typeof o.weightLimitKg === "number" && Number.isFinite(o.weightLimitKg)
          ? o.weightLimitKg
          : null,
      limitType:
        o.limitType === "under" ||
        o.limitType === "over" ||
        o.limitType === "range"
          ? o.limitType
          : null,
      displayOrder:
        typeof o.displayOrder === "number" && Number.isInteger(o.displayOrder)
          ? o.displayOrder
          : null,
      isActive: o.isActive === false ? false : true,
      skillLevel: typeof o.skillLevel === "string" ? o.skillLevel : null,
    });
  }

  return sortTemplateItems(out);
}

export type DivisionTemplateListItemVM = {
  id: string;
  title: string;
  sportType: string | null;
  description: string | null;
  itemCount: number;
  isActive: boolean;
  updatedAt: string;
  organizerId: string;
  organizerName: string;
};

export type DivisionTemplateDetailVM = {
  id: string;
  title: string;
  sportType: string | null;
  description: string | null;
  isActive: boolean;
  items: DivisionTemplateItemInput[];
  updatedAt: string;
  organizerId: string;
  organizerName: string;
};

function mapListItemVM(row: DivisionTemplateListRow): DivisionTemplateListItemVM {
  const items = parseTemplateItemsFromJson(row.items, row.sportType);
  return {
    id: row.id,
    title: row.title,
    sportType: row.sportType,
    description: row.description,
    itemCount: items.filter((i) => i.isActive !== false).length,
    isActive: row.isActive,
    updatedAt: row.updatedAt.toISOString(),
    organizerId: row.organizerId,
    organizerName: row.organizer.name,
  };
}

function mapDetailVM(row: DivisionTemplateListRow): DivisionTemplateDetailVM {
  return {
    id: row.id,
    title: row.title,
    sportType: row.sportType,
    description: row.description,
    isActive: row.isActive,
    items: parseTemplateItemsFromJson(row.items, row.sportType),
    updatedAt: row.updatedAt.toISOString(),
    organizerId: row.organizerId,
    organizerName: row.organizer.name,
  };
}

export const divisionTemplateService = {
  async listTemplatesDetailed(
    actor: ActorContext,
    organizerIdInput?: string,
  ): Promise<DivisionTemplateDetailVM[]> {
    const rows = await listTemplateRows(actor, {
      organizerId: organizerIdInput,
    });
    return rows.map(mapDetailVM);
  },

  async listTemplates(
    actor: ActorContext,
    organizerIdInput?: string,
  ): Promise<DivisionTemplateListItemVM[]> {
    const rows = await listTemplateRows(actor, {
      organizerId: organizerIdInput,
    });
    return rows.map(mapListItemVM);
  },

  async getTemplateById(
    actor: ActorContext,
    templateId: string,
  ): Promise<DivisionTemplateDetailVM> {
    requireRole(actor, ["organizer", "admin"]);
    const row = await divisionTemplateRepository.findById(templateId);
    if (!row) {
      throw new AppError("NOT_FOUND", "템플릿을 찾을 수 없습니다.");
    }
    assertTemplateOwned(actor, row.organizerId);
    return mapDetailVM(row);
  },

  async listTemplatesForEvent(
    actor: ActorContext,
    eventId: string,
  ): Promise<DivisionTemplateListItemVM[]> {
    await requireOrganizerForEvent(actor, eventId);
    const eventRow = await eventRepository.findOrganizerEventById(eventId);
    if (!eventRow) {
      throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
    }
    const rows = await this.listTemplates(actor, eventRow.organizerId);
    return rows.filter((t) => t.isActive);
  },

  async listTemplateDetailsForEvent(
    actor: ActorContext,
    eventId: string,
  ): Promise<DivisionTemplateDetailVM[]> {
    await requireOrganizerForEvent(actor, eventId);
    const eventRow = await eventRepository.findOrganizerEventById(eventId);
    if (!eventRow) {
      throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
    }
    const rows = await this.listTemplatesDetailed(actor, eventRow.organizerId);
    return rows.filter((t) => t.isActive);
  },

  async createTemplate(
    actor: ActorContext,
    input: CreateDivisionTemplateInput,
  ): Promise<{ templateId: string }> {
    requireRole(actor, ["organizer", "admin"]);
    const organizerId = resolveOrganizerIdForWrite(actor, input.organizerId);
    const row = await divisionTemplateRepository.create({
      organizerId,
      title: input.title,
      sportType: input.sportType ?? null,
      description: input.description ?? null,
      isActive: input.isActive ?? true,
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
      isActive: input.isActive,
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
  ): Promise<{
    created: number;
    skippedDuplicates: number;
    removed: number;
  }> {
    await requireOrganizerForEvent(actor, input.eventId);

    const tpl = await divisionTemplateRepository.findById(input.templateId);
    if (!tpl) {
      throw new AppError("NOT_FOUND", "템플릿을 찾을 수 없습니다.");
    }
    if (!tpl.isActive) {
      throw new AppError("VALIDATION_ERROR", "비활성 템플릿은 적용할 수 없습니다.");
    }

    const eventRow = await eventRepository.findOrganizerEventById(input.eventId);
    if (!eventRow || eventRow.organizerId !== tpl.organizerId) {
      throw new AppError(
        "FORBIDDEN",
        "다른 주최자의 템플릿은 이 대회에 적용할 수 없습니다.",
      );
    }

    const parsedItems = parseTemplateItemsFromJson(tpl.items, tpl.sportType);
    const activeRows = parsedItems
      .map((item) => itemToEventDivisionRow(tpl.sportType, item))
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (activeRows.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "템플릿에 적용 가능한 부문 항목이 없습니다.",
      );
    }

    let existingDivisions = await eventRepository.listEventDivisions(
      input.eventId,
    );
    let removed = 0;

    if (input.mode === "replace") {
      for (const division of existingDivisions) {
        const [appCount, bracketCount] = await Promise.all([
          eventRepository.countApplicationsByDivision(division.id),
          eventRepository.countBracketsByDivision(division.id),
        ]);
        if (appCount > 0 || bracketCount > 0) {
          throw new AppError(
            "CONFLICT",
            "신청자 또는 대진표가 있는 부문이 있어 초기화할 수 없습니다.",
          );
        }
      }

      for (const division of existingDivisions) {
        await eventRepository.deleteEventDivision(division.id);
        removed += 1;
      }
      existingDivisions = [];
    }

    const existingKeys = new Set(
      existingDivisions.map((d) =>
        normalizeEventDivisionKey({
          sportType: d.sportType,
          gender: d.gender,
          ageGroup: d.ageGroup,
          weightClass: d.weightClass,
        }),
      ),
    );

    let created = 0;
    let skippedDuplicates = 0;
    const skipDuplicates = input.mode !== "append_all";

    for (const normalized of activeRows) {
      const key = normalizeEventDivisionKey(normalized);
      if (skipDuplicates && existingKeys.has(key)) {
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

    return { created, skippedDuplicates, removed };
  },
};

/** 미리보기·UI용 */
export function previewTemplateItems(
  template: Pick<DivisionTemplateDetailVM, "sportType" | "items">,
): Array<DivisionTemplateItemInput & { weightClassDisplay: string }> {
  return sortTemplateItems(template.items)
    .filter((item) => item.isActive !== false)
    .map((item) => ({
      ...item,
      weightClassDisplay: buildWeightClassDisplay(item),
    }));
}
