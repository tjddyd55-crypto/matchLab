/**
 * 체급표 재구성 — 재배정 plan (순수 함수, DB 없음).
 * resolveEventDivisionByApplicationWeight SSOT 재사용.
 */
import { formatApplicationDivisionLabel } from "@/lib/applications/application-division-label";
import {
  resolveEventDivisionByApplicationWeight,
  type DivisionResolverCandidate,
} from "@/lib/applications/resolve-event-division";
import { parseApplicantGender } from "@/lib/applicant-excel/normalize";
import type { EventDivisionFromTemplateRow } from "@/lib/division-template/division-template-row";
import { formatDivisionSearchLabel } from "@/lib/event-division-fields";
import { resolveApplicationGymDisplayName } from "@/lib/gym/external-registration-placeholder-gym";

export type RebuildAssignmentReasonCode =
  | "auto"
  | "ambiguous"
  | "no_weight_match"
  | "no_division_table"
  | "category_unknown"
  | "missing_weight"
  | "missing_gender"
  | "other_unmatched"
  | "other_exact";

export type RebuildPendingApplicantVM = {
  applicationId: string;
  fighterName: string;
  fighterGender: string;
  gymName: string;
  appliedDivisionLabel: string;
  applicationWeightKg: number | null;
  reasonCode: RebuildAssignmentReasonCode;
  reasonLabel: string;
  candidateSummary: string;
};

export type RebuildAssignmentPlan = {
  applicationId: string;
  targetDivisionId: string | null;
  reasonCode: RebuildAssignmentReasonCode;
};

export type DivisionRebuildAppInput = {
  id: string;
  divisionSelectionType: "REGISTERED" | "OTHER" | string | null;
  requestedDivisionText: string | null;
  fighterSnapshot: unknown;
  gymSnapshot: unknown;
  gymNameSnapshot: string | null;
  fighter: { id: string; name: string; gender: string };
  division: {
    id: string;
    sportType: string;
    gender: string | null;
    ageGroup: string | null;
    weightClass: string | null;
    weightClassName: string | null;
    weightLimitText: string | null;
    skillLevel: string | null;
    ruleType: string | null;
  } | null;
  gym: { id: string; name: string } | null;
};

function reasonLabel(code: RebuildAssignmentReasonCode): string {
  switch (code) {
    case "auto":
      return "자동 재배정";
    case "other_exact":
      return "요청 체급과 새 체급표 일치";
    case "ambiguous":
      return "후보 경기구분이 여러 개";
    case "no_weight_match":
      return "새 체급표에 조건 일치 없음";
    case "no_division_table":
      return "해당 부문·성별·종목 체급표 없음";
    case "category_unknown":
      return "경기구분 정보 부족";
    case "missing_weight":
      return "신청체중 없음";
    case "missing_gender":
      return "성별 정보 없음";
    case "other_unmatched":
      return "기타 요청 체급이 새 체급표에 없음";
    default:
      return "확인 필요";
  }
}

function readApplicationWeightKg(fighterSnapshot: unknown): number | null {
  if (
    !fighterSnapshot ||
    typeof fighterSnapshot !== "object" ||
    Array.isArray(fighterSnapshot)
  ) {
    return null;
  }
  const raw = (fighterSnapshot as Record<string, unknown>).applicationWeightKg;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function readCompetitionCategory(app: {
  division: { ageGroup: string | null } | null;
  requestedDivisionText: string | null;
  fighterSnapshot: unknown;
}): string {
  const fromDivision = app.division?.ageGroup?.trim();
  if (fromDivision) return fromDivision;
  if (
    app.fighterSnapshot &&
    typeof app.fighterSnapshot === "object" &&
    !Array.isArray(app.fighterSnapshot)
  ) {
    const snap = app.fighterSnapshot as Record<string, unknown>;
    for (const key of ["competitionCategory", "ageGroup"] as const) {
      const v = snap[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  const requested = app.requestedDivisionText?.trim();
  if (requested) return requested;
  return "";
}

function toResolverCandidate(
  row: EventDivisionFromTemplateRow & { id: string },
): DivisionResolverCandidate {
  return {
    id: row.id,
    gender: row.gender,
    ageGroup: row.ageGroup,
    sportType: row.sportType,
    ruleType: row.ruleType,
    weightClass: row.weightClass,
    weightClassName: row.weightClassName,
    weightLimitText: row.weightLimitText,
    skillLevel: row.skillLevel,
  };
}

function findExactOtherMatch(
  requestedText: string,
  divisions: Array<EventDivisionFromTemplateRow & { id: string }>,
): (EventDivisionFromTemplateRow & { id: string }) | null {
  const want = requestedText.trim().toLowerCase();
  if (!want) return null;
  const hits = divisions.filter((d) => {
    const label = formatDivisionSearchLabel(d).toLowerCase();
    const chip = [d.weightClassName, d.weightLimitText]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const legacy = (d.weightClass ?? "").toLowerCase();
    return label === want || chip === want || legacy === want;
  });
  if (hits.length === 1) return hits[0]!;
  return null;
}

export function planDivisionRebuildAssignments(input: {
  apps: DivisionRebuildAppInput[];
  divisionRows: Array<EventDivisionFromTemplateRow & { id: string }>;
  templateSportType: string | null;
}): {
  plans: RebuildAssignmentPlan[];
  autoReassign: number;
  needsReview: number;
  unassigned: number;
  pendingApplicants: RebuildPendingApplicantVM[];
} {
  const candidates = input.divisionRows.map(toResolverCandidate);
  const plans: RebuildAssignmentPlan[] = [];
  const pendingApplicants: RebuildPendingApplicantVM[] = [];
  let autoReassign = 0;
  let needsReview = 0;
  let unassigned = 0;

  for (const app of input.apps) {
    const appliedDivisionLabel = formatApplicationDivisionLabel({
      division: app.division,
      divisionSelectionType:
        app.divisionSelectionType === "OTHER" ||
        app.divisionSelectionType === "REGISTERED"
          ? app.divisionSelectionType
          : null,
      requestedDivisionText: app.requestedDivisionText,
    });
    const gymName = resolveApplicationGymDisplayName({
      gymNameSnapshot: app.gymNameSnapshot,
      gymSnapshot: app.gymSnapshot,
      gymRelationName: app.gym?.name,
    });
    const weightKg = readApplicationWeightKg(app.fighterSnapshot);
    const basePending = {
      applicationId: app.id,
      fighterName: app.fighter.name,
      fighterGender: app.fighter.gender ?? "",
      gymName,
      appliedDivisionLabel,
      applicationWeightKg: weightKg,
    };

    if (app.divisionSelectionType === "OTHER") {
      const text = app.requestedDivisionText?.trim() ?? "";
      const exact = findExactOtherMatch(text, input.divisionRows);
      if (exact) {
        autoReassign += 1;
        plans.push({
          applicationId: app.id,
          targetDivisionId: exact.id,
          reasonCode: "other_exact",
        });
        continue;
      }
      unassigned += 1;
      pendingApplicants.push({
        ...basePending,
        reasonCode: "other_unmatched",
        reasonLabel: reasonLabel("other_unmatched"),
        candidateSummary: "0명",
      });
      plans.push({
        applicationId: app.id,
        targetDivisionId: null,
        reasonCode: "other_unmatched",
      });
      continue;
    }

    const genderParsed = parseApplicantGender(app.fighter.gender ?? "");
    if (!genderParsed.ok) {
      unassigned += 1;
      pendingApplicants.push({
        ...basePending,
        reasonCode: "missing_gender",
        reasonLabel: reasonLabel("missing_gender"),
        candidateSummary: "0명",
      });
      plans.push({
        applicationId: app.id,
        targetDivisionId: null,
        reasonCode: "missing_gender",
      });
      continue;
    }

    if (weightKg == null) {
      unassigned += 1;
      pendingApplicants.push({
        ...basePending,
        reasonCode: "missing_weight",
        reasonLabel: reasonLabel("missing_weight"),
        candidateSummary: "0명",
      });
      plans.push({
        applicationId: app.id,
        targetDivisionId: null,
        reasonCode: "missing_weight",
      });
      continue;
    }

    const category = readCompetitionCategory(app);
    const resolved = resolveEventDivisionByApplicationWeight({
      gender: genderParsed.gender,
      competitionCategory: category,
      discipline: app.division?.sportType ?? input.templateSportType,
      applicationWeightKg: weightKg,
      divisions: candidates,
    });

    if (resolved.ok) {
      autoReassign += 1;
      plans.push({
        applicationId: app.id,
        targetDivisionId: resolved.division.id,
        reasonCode: "auto",
      });
      continue;
    }

    const code: RebuildAssignmentReasonCode =
      resolved.code === "ambiguous"
        ? "ambiguous"
        : resolved.code === "no_weight_match"
          ? "no_weight_match"
          : resolved.code === "no_division_table"
            ? "no_division_table"
            : "category_unknown";

    if (code === "ambiguous") needsReview += 1;
    else unassigned += 1;

    pendingApplicants.push({
      ...basePending,
      reasonCode: code,
      reasonLabel: resolved.reason || reasonLabel(code),
      candidateSummary: code === "ambiguous" ? "여러 명" : "0명",
    });
    plans.push({
      applicationId: app.id,
      targetDivisionId: null,
      reasonCode: code,
    });
  }

  return { plans, autoReassign, needsReview, unassigned, pendingApplicants };
}
