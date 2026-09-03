import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import {
  itemToEventDivisionRow,
  normalizeEventDivisionKey,
  normalizeTemplateItemWeight,
  type EventDivisionFromTemplateRow,
} from "@/lib/division-template/division-template-row";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { bracketRepository } from "@/lib/repositories/bracket.repository";
import { divisionTemplateRepository } from "@/lib/repositories/division-template.repository";
import { eventRepository } from "@/lib/repositories/event.repository";
import {
  planTemplateDivisionApply,
  type TemplateDivisionApplyPlan,
  type TemplateDivisionPlanItem,
} from "@/lib/services/event-division-template-apply-plan";
import type {
  DivisionTemplateItemInput,
  RebuildEventDivisionsFromTemplateInput,
} from "@/lib/validators/division-template.validator";

/** @deprecated future reclassification only — template apply must NOT use */
export type {
  RebuildAssignmentReasonCode,
  RebuildPendingApplicantVM,
} from "@/lib/services/event-division-rebuild-plan";

/** @deprecated future reclassification only — template apply must NOT use */
export { planDivisionRebuildAssignments } from "@/lib/services/event-division-rebuild-plan";

export type RebuildEventDivisionsPreviewVM = {
  templateId: string;
  templateName: string;
  currentDivisions: number;
  currentMatches: number;
  applicants: number;
  expectedNewDivisions: number;
  keepDivisions: number;
  newDivisions: number;
  removedDivisions: number;
  removedWithApplicants: number;
  removedApplicantTotal: number;
  /** @deprecated always 0 — Application 재분류 제거 */
  autoReassign: number;
  /** @deprecated always 0 */
  needsReview: number;
  /** @deprecated always 0 */
  unassigned: number;
  blockedByResults: boolean;
  blockedByRemovedApplicants: boolean;
  blocked: boolean;
  blockReason: string | null;
  matchesWithResults: number;
  keepItems: TemplateDivisionPlanItem[];
  newItems: TemplateDivisionPlanItem[];
  removedItems: TemplateDivisionPlanItem[];
  removedApplicantItems: TemplateDivisionPlanItem[];
  /** @deprecated empty — Application 재분류 UI 제거 */
  pendingApplicants: [];
};

export type RebuildEventDivisionsResultVM = RebuildEventDivisionsPreviewVM & {
  deletedMatches: number;
  deletedBrackets: number;
  createdDivisions: number;
  deletedUnusedDivisions: number;
  keptDivisions: number;
  applicationMutations: 0;
};

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

    const normalized = normalizeTemplateItemWeight({
      sportType,
      ruleType: typeof o.ruleType === "string" ? o.ruleType : null,
      gender: typeof o.gender === "string" ? o.gender : null,
      ageGroup: typeof o.ageGroup === "string" ? o.ageGroup : null,
      weightClass: legacyWeightClass,
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
        typeof o.displayOrder === "number" ? o.displayOrder : null,
      isActive: typeof o.isActive === "boolean" ? o.isActive : true,
      skillLevel: typeof o.skillLevel === "string" ? o.skillLevel : null,
    });
    out.push(normalized);
  }
  return out;
}

async function loadTemplateActiveRows(templateId: string) {
  const tpl = await divisionTemplateRepository.findById(templateId);
  if (!tpl) {
    throw new AppError("NOT_FOUND", "템플릿을 찾을 수 없습니다.");
  }
  if (!tpl.isActive) {
    throw new AppError("VALIDATION_ERROR", "비활성 템플릿은 적용할 수 없습니다.");
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
  return { tpl, activeRows };
}

async function buildApplyPlan(
  eventId: string,
  activeRows: EventDivisionFromTemplateRow[],
): Promise<{
  plan: TemplateDivisionApplyPlan;
  currentDivisions: number;
  currentMatches: number;
  applicants: number;
  matchesWithResults: number;
}> {
  const existing = await eventRepository.listEventDivisions(eventId);
  const withCounts = await Promise.all(
    existing.map(async (d) => ({
      id: d.id,
      sportType: d.sportType,
      ruleType: d.ruleType,
      gender: d.gender,
      ageGroup: d.ageGroup,
      weightClass: d.weightClass,
      weightClassName: d.weightClassName,
      weightLimitText: d.weightLimitText,
      skillLevel: d.skillLevel,
      applicantCount: await eventRepository.countApplicationsByDivision(d.id),
    })),
  );

  const [currentMatches, applicants, matchesWithResults] = await Promise.all([
    bracketRepository.countMatchesByEvent(eventId),
    eventRepository.countApplicationsByEvent(eventId),
    bracketRepository.countEventMatchesWithOfficialResults(eventId),
  ]);

  const plan = planTemplateDivisionApply({
    existing: withCounts,
    templateRows: activeRows,
  });

  return {
    plan,
    currentDivisions: existing.length,
    currentMatches,
    applicants,
    matchesWithResults,
  };
}

function toPreviewVm(input: {
  templateId: string;
  templateName: string;
  plan: TemplateDivisionApplyPlan;
  currentDivisions: number;
  currentMatches: number;
  applicants: number;
  matchesWithResults: number;
  expectedNewDivisions: number;
}): RebuildEventDivisionsPreviewVM {
  const blockedByResults = input.matchesWithResults > 0;
  const blockedByRemovedApplicants = input.plan.blockedByRemovedApplicants;
  const blocked = blockedByResults || blockedByRemovedApplicants;

  let blockReason: string | null = null;
  if (blockedByResults) {
    blockReason =
      "경기 결과가 등록된 대진이 있어 새 체급표로 재구성할 수 없습니다.";
  } else if (blockedByRemovedApplicants) {
    const lines = input.plan.removedWithApplicants
      .map((r) => `· ${r.label}: ${r.applicantCount}명`)
      .join("\n");
    blockReason = [
      "새 템플릿에서 사라지는 경기구분에 신청자가 있어 적용할 수 없습니다.",
      "신청 경기구분은 자동으로 변경하지 않습니다. 신청자를 직접 수정한 뒤 다시 시도하세요.",
      "",
      lines,
    ].join("\n");
  }

  return {
    templateId: input.templateId,
    templateName: input.templateName,
    currentDivisions: input.currentDivisions,
    currentMatches: input.currentMatches,
    applicants: input.applicants,
    expectedNewDivisions: input.expectedNewDivisions,
    keepDivisions: input.plan.keep.length,
    newDivisions: input.plan.created.length,
    removedDivisions: input.plan.removed.length,
    removedWithApplicants: input.plan.removedWithApplicants.length,
    removedApplicantTotal: input.plan.removedApplicantTotal,
    autoReassign: 0,
    needsReview: 0,
    unassigned: 0,
    blockedByResults,
    blockedByRemovedApplicants,
    blocked,
    blockReason,
    matchesWithResults: input.matchesWithResults,
    keepItems: input.plan.keep,
    newItems: input.plan.created,
    removedItems: input.plan.removed,
    removedApplicantItems: input.plan.removedWithApplicants,
    pendingApplicants: [],
  };
}

/**
 * Template apply = EventDivision KEEP/NEW/REMOVED + optional bracket reset.
 * EventApplication.divisionId / selectionType / snapshots 절대 변경하지 않음.
 *
 * FK note: EventApplication.division onDelete=Cascade
 * → 신청자가 있는 EventDivision 삭제는 신청 삭제와 동일하므로 차단.
 */
export const eventDivisionRebuildService = {
  async previewRebuild(
    actor: ActorContext,
    input: RebuildEventDivisionsFromTemplateInput,
  ): Promise<RebuildEventDivisionsPreviewVM> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, input.eventId);

    const { tpl, activeRows } = await loadTemplateActiveRows(input.templateId);
    const eventRow = await eventRepository.findOrganizerEventById(input.eventId);
    if (!eventRow || eventRow.organizerId !== tpl.organizerId) {
      throw new AppError(
        "FORBIDDEN",
        "다른 주최자의 템플릿은 이 대회에 적용할 수 없습니다.",
      );
    }

    const built = await buildApplyPlan(input.eventId, activeRows);
    return toPreviewVm({
      templateId: tpl.id,
      templateName: tpl.title,
      plan: built.plan,
      currentDivisions: built.currentDivisions,
      currentMatches: built.currentMatches,
      applicants: built.applicants,
      matchesWithResults: built.matchesWithResults,
      expectedNewDivisions: activeRows.length,
    });
  },

  async rebuild(
    actor: ActorContext,
    input: RebuildEventDivisionsFromTemplateInput,
  ): Promise<RebuildEventDivisionsResultVM> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, input.eventId);

    const { tpl, activeRows } = await loadTemplateActiveRows(input.templateId);
    const eventRow = await eventRepository.findOrganizerEventById(input.eventId);
    if (!eventRow || eventRow.organizerId !== tpl.organizerId) {
      throw new AppError(
        "FORBIDDEN",
        "다른 주최자의 템플릿은 이 대회에 적용할 수 없습니다.",
      );
    }

    const built = await buildApplyPlan(input.eventId, activeRows);
    const preview = toPreviewVm({
      templateId: tpl.id,
      templateName: tpl.title,
      plan: built.plan,
      currentDivisions: built.currentDivisions,
      currentMatches: built.currentMatches,
      applicants: built.applicants,
      matchesWithResults: built.matchesWithResults,
      expectedNewDivisions: activeRows.length,
    });

    if (preview.blocked) {
      throw new AppError(
        "CONFLICT",
        preview.blockReason ?? "새 템플릿을 적용할 수 없습니다.",
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Bracket reset only — Application rows untouched
        const { deletedMatches, deletedBrackets } =
          await bracketRepository.deleteAllEventBrackets(input.eventId, tx);

        // KEEP: existing EventDivision rows preserved (Application FK intact)
        let createdDivisions = 0;
        const seenKeys = new Set(
          built.plan.keep.map((k) => k.key),
        );

        for (const item of built.plan.created) {
          const row = item.templateRow;
          if (!row) continue;
          const key = normalizeEventDivisionKey(row);
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);

          await eventRepository.createEventDivision(
            {
              event: { connect: { id: input.eventId } },
              sportType: row.sportType.trim(),
              ruleType: row.ruleType?.trim() || null,
              gender: row.gender?.trim() || null,
              ageGroup: row.ageGroup?.trim() || null,
              weightClass: row.weightClass?.trim() || null,
              weightClassName: row.weightClassName?.trim() || null,
              weightLimitText: row.weightLimitText?.trim() || null,
              skillLevel: row.skillLevel?.trim() || null,
            },
            tx,
          );
          createdDivisions += 1;
        }

        // REMOVED without applicants only (Cascade-safe)
        let deletedUnusedDivisions = 0;
        for (const item of built.plan.removed) {
          if (item.applicantCount > 0) {
            throw new AppError(
              "CONFLICT",
              "신청자가 있는 경기구분은 삭제할 수 없습니다.",
            );
          }
          if (!item.existingDivisionId) continue;
          await eventRepository.deleteEventDivision(
            item.existingDivisionId,
            tx,
          );
          deletedUnusedDivisions += 1;
        }

        // SSOT: never clear/reassign EventApplication.divisionId
        return {
          deletedMatches,
          deletedBrackets,
          createdDivisions,
          deletedUnusedDivisions,
          keptDivisions: built.plan.keep.length,
        };
      },
      { timeout: 60_000, maxWait: 10_000 },
    );

    return {
      ...preview,
      deletedMatches: result.deletedMatches,
      deletedBrackets: result.deletedBrackets,
      createdDivisions: result.createdDivisions,
      deletedUnusedDivisions: result.deletedUnusedDivisions,
      keptDivisions: result.keptDivisions,
      applicationMutations: 0,
    };
  },
};
