/**
 * Template apply plan — EventDivision semantic KEEP/NEW/REMOVED.
 * Application reclassification 없음 (순수 함수, DB 없음).
 */
import {
  normalizeEventDivisionKey,
  type EventDivisionFromTemplateRow,
} from "@/lib/division-template/division-template-row";
import {
  formatDivisionMainLabel,
  toEventDivisionDisplayInput,
} from "@/lib/event-division-fields";

export type TemplateDivisionSemanticRow = EventDivisionFromTemplateRow & {
  id?: string;
};

export type ExistingDivisionForTemplatePlan = {
  id: string;
  sportType: string;
  ruleType: string | null;
  gender: string | null;
  ageGroup: string | null;
  weightClass: string | null;
  weightClassName: string | null;
  weightLimitText: string | null;
  skillLevel: string | null;
  applicantCount: number;
};

export type TemplateDivisionPlanItem = {
  key: string;
  label: string;
  kind: "keep" | "new" | "removed";
  existingDivisionId: string | null;
  applicantCount: number;
  templateRow: EventDivisionFromTemplateRow | null;
};

export type TemplateDivisionApplyPlan = {
  keep: TemplateDivisionPlanItem[];
  created: TemplateDivisionPlanItem[];
  removed: TemplateDivisionPlanItem[];
  removedWithApplicants: TemplateDivisionPlanItem[];
  removedApplicantTotal: number;
  blockedByRemovedApplicants: boolean;
};

function divisionLabel(row: {
  sportType: string;
  ruleType?: string | null;
  gender?: string | null;
  ageGroup?: string | null;
  weightClass?: string | null;
  weightClassName?: string | null;
  weightLimitText?: string | null;
  skillLevel?: string | null;
}): string {
  const input = toEventDivisionDisplayInput({
    sportType: row.sportType,
    ruleType: row.ruleType ?? null,
    gender: row.gender ?? null,
    ageGroup: row.ageGroup ?? null,
    weightClass: row.weightClass ?? null,
    weightClassName: row.weightClassName ?? null,
    weightLimitText: row.weightLimitText ?? null,
    skillLevel: row.skillLevel ?? null,
  });
  if (!input) return "경기구분";
  return formatDivisionMainLabel(input) || "경기구분";
}

/**
 * 기존 EventDivision vs template items — semantic key 매칭.
 * KEEP = 기존 row 유지 (Application.divisionId FK 보존)
 * NEW = 신규 생성
 * REMOVED = template에 없음 (신청자 있으면 apply 차단)
 */
export function planTemplateDivisionApply(input: {
  existing: ExistingDivisionForTemplatePlan[];
  templateRows: EventDivisionFromTemplateRow[];
}): TemplateDivisionApplyPlan {
  const templateByKey = new Map<string, EventDivisionFromTemplateRow>();
  for (const row of input.templateRows) {
    const key = normalizeEventDivisionKey(row);
    if (!templateByKey.has(key)) templateByKey.set(key, row);
  }

  const keep: TemplateDivisionPlanItem[] = [];
  const created: TemplateDivisionPlanItem[] = [];
  const removed: TemplateDivisionPlanItem[] = [];

  // Match existing → KEEP or REMOVED
  for (const existing of input.existing) {
    const key = normalizeEventDivisionKey(existing);
    const templateRow = templateByKey.get(key) ?? null;
    if (templateRow) {
      keep.push({
        key,
        label: divisionLabel(existing),
        kind: "keep",
        existingDivisionId: existing.id,
        applicantCount: existing.applicantCount,
        templateRow,
      });
      templateByKey.delete(key);
    } else {
      removed.push({
        key,
        label: divisionLabel(existing),
        kind: "removed",
        existingDivisionId: existing.id,
        applicantCount: existing.applicantCount,
        templateRow: null,
      });
    }
  }

  // Remaining template keys → NEW
  for (const [key, templateRow] of templateByKey) {
    created.push({
      key,
      label: divisionLabel(templateRow),
      kind: "new",
      existingDivisionId: null,
      applicantCount: 0,
      templateRow,
    });
  }

  const removedWithApplicants = removed.filter((r) => r.applicantCount > 0);
  const removedApplicantTotal = removedWithApplicants.reduce(
    (sum, r) => sum + r.applicantCount,
    0,
  );

  return {
    keep,
    created,
    removed,
    removedWithApplicants,
    removedApplicantTotal,
    blockedByRemovedApplicants: removedWithApplicants.length > 0,
  };
}
