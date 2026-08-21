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
import { applicationRepository } from "@/lib/repositories/application.repository";
import { bracketRepository } from "@/lib/repositories/bracket.repository";
import { divisionTemplateRepository } from "@/lib/repositories/division-template.repository";
import { eventRepository } from "@/lib/repositories/event.repository";
import {
  planDivisionRebuildAssignments,
  type RebuildPendingApplicantVM,
} from "@/lib/services/event-division-rebuild-plan";
import type {
  DivisionTemplateItemInput,
  RebuildEventDivisionsFromTemplateInput,
} from "@/lib/validators/division-template.validator";

export type {
  RebuildAssignmentReasonCode,
  RebuildPendingApplicantVM,
} from "@/lib/services/event-division-rebuild-plan";

export { planDivisionRebuildAssignments } from "@/lib/services/event-division-rebuild-plan";

export type RebuildEventDivisionsPreviewVM = {
  templateId: string;
  templateName: string;
  currentDivisions: number;
  currentMatches: number;
  applicants: number;
  expectedNewDivisions: number;
  autoReassign: number;
  needsReview: number;
  unassigned: number;
  blockedByResults: boolean;
  matchesWithResults: number;
  pendingApplicants: RebuildPendingApplicantVM[];
};

export type RebuildEventDivisionsResultVM = RebuildEventDivisionsPreviewVM & {
  removedDivisions: number;
  deletedMatches: number;
  deletedBrackets: number;
  newDivisions: number;
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

    const [apps, currentDivisions, currentMatches, matchesWithResults] =
      await Promise.all([
        applicationRepository.listApplicationsForDivisionRebuild(input.eventId),
        eventRepository.countEventDivisions(input.eventId),
        bracketRepository.countMatchesByEvent(input.eventId),
        bracketRepository.countEventMatchesWithOfficialResults(input.eventId),
      ]);

    const synthetic = activeRows.map((row, idx) => ({
      ...row,
      id: `preview-${idx}`,
    }));
    const planned = planDivisionRebuildAssignments({
      apps,
      divisionRows: synthetic,
      templateSportType: tpl.sportType,
    });

    return {
      templateId: tpl.id,
      templateName: tpl.title,
      currentDivisions,
      currentMatches,
      applicants: apps.length,
      expectedNewDivisions: activeRows.length,
      autoReassign: planned.autoReassign,
      needsReview: planned.needsReview,
      unassigned: planned.unassigned,
      blockedByResults: matchesWithResults > 0,
      matchesWithResults,
      pendingApplicants: planned.pendingApplicants,
    };
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

    const matchesWithResults =
      await bracketRepository.countEventMatchesWithOfficialResults(
        input.eventId,
      );
    if (matchesWithResults > 0) {
      throw new AppError(
        "CONFLICT",
        "경기 결과가 등록된 대진이 있어 새 체급표로 재구성할 수 없습니다.",
      );
    }

    const appsBefore =
      await applicationRepository.listApplicationsForDivisionRebuild(
        input.eventId,
      );
    const currentDivisions = await eventRepository.countEventDivisions(
      input.eventId,
    );
    const currentMatches = await bracketRepository.countMatchesByEvent(
      input.eventId,
    );

    const result = await prisma.$transaction(
      async (tx) => {
      // Cascade 방지: EventDivision 삭제 전 반드시 detach
      await applicationRepository.clearDivisionIdsForEvent(input.eventId, tx);

      const { deletedMatches, deletedBrackets } =
        await bracketRepository.deleteAllEventBrackets(input.eventId, tx);

      const removedDivisions = await eventRepository.deleteAllEventDivisions(
        input.eventId,
        tx,
      );

      const createdDivisions: Array<
        EventDivisionFromTemplateRow & { id: string }
      > = [];
      const seenKeys = new Set<string>();

      for (const normalized of activeRows) {
        const key = normalizeEventDivisionKey(normalized);
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const created = await eventRepository.createEventDivision(
          {
            event: { connect: { id: input.eventId } },
            sportType: normalized.sportType.trim(),
            ruleType: normalized.ruleType?.trim() || null,
            gender: normalized.gender?.trim() || null,
            ageGroup: normalized.ageGroup?.trim() || null,
            weightClass: normalized.weightClass?.trim() || null,
            weightClassName: normalized.weightClassName?.trim() || null,
            weightLimitText: normalized.weightLimitText?.trim() || null,
            skillLevel: normalized.skillLevel?.trim() || null,
          },
          tx,
        );
        createdDivisions.push({ ...normalized, id: created.id });
      }

      const planned = planDivisionRebuildAssignments({
        apps: appsBefore,
        divisionRows: createdDivisions,
        templateSportType: tpl.sportType,
      });

      // divisionId별 배치 연결 (트랜잭션 시간 단축)
      const byDivision = new Map<string, string[]>();
      const otherExactIds: string[] = [];
      for (const plan of planned.plans) {
        if (!plan.targetDivisionId) continue;
        const list = byDivision.get(plan.targetDivisionId) ?? [];
        list.push(plan.applicationId);
        byDivision.set(plan.targetDivisionId, list);
        if (plan.reasonCode === "other_exact") {
          otherExactIds.push(plan.applicationId);
        }
      }

      for (const [divisionId, applicationIds] of byDivision) {
        await tx.eventApplication.updateMany({
          where: { id: { in: applicationIds } },
          data: { divisionId },
        });
      }
      if (otherExactIds.length > 0) {
        await tx.eventApplication.updateMany({
          where: { id: { in: otherExactIds } },
          data: { divisionSelectionType: "REGISTERED" },
        });
      }

      return {
        deletedMatches,
        deletedBrackets,
        removedDivisions,
        newDivisions: createdDivisions.length,
        planned,
      };
      },
      { timeout: 60_000, maxWait: 10_000 },
    );

    return {
      templateId: tpl.id,
      templateName: tpl.title,
      currentDivisions,
      currentMatches,
      applicants: appsBefore.length,
      expectedNewDivisions: activeRows.length,
      autoReassign: result.planned.autoReassign,
      needsReview: result.planned.needsReview,
      unassigned: result.planned.unassigned,
      blockedByResults: false,
      matchesWithResults: 0,
      pendingApplicants: result.planned.pendingApplicants,
      removedDivisions: result.removedDivisions,
      deletedMatches: result.deletedMatches,
      deletedBrackets: result.deletedBrackets,
      newDivisions: result.newDivisions,
    };
  },
};
