/**
 * 신청체중 → EventDivision 자동배정 SSOT.
 * 새 체급을 추정하지 않고, 주최자가 등록한 EventDivision만 사용한다.
 */

import { foldKey, parseApplicantGender } from "@/lib/applicant-excel/normalize";
import {
  formatDivisionSearchLabel,
  formatDivisionSportTitle,
  formatDivisionWeightChipLabel,
  normalizeWeightLimitDisplayText,
  resolveEventDivisionWeightFields,
} from "@/lib/event-division-fields";
import { DIVISION_TEMPLATE_SPORT_LABELS } from "@/lib/division-template/division-template-constants";
import {
  eventAgeGroupMatchesInput,
  normalizeCompetitionCategory,
  type NormalizedCompetitionCategory,
} from "@/lib/applications/competition-category";

export type DivisionResolverCandidate = {
  id: string;
  gender?: string | null;
  ageGroup?: string | null;
  sportType?: string | null;
  ruleType?: string | null;
  weightClass?: string | null;
  weightClassName?: string | null;
  weightLimitText?: string | null;
  skillLevel?: string | null;
};

export type ResolveEventDivisionInput = {
  gender: "male" | "female";
  competitionCategory: string;
  discipline?: string | null;
  applicationWeightKg: number;
  divisions: DivisionResolverCandidate[];
};

export type ResolvedEventDivision = {
  id: string;
  label: string;
  ageGroup: string | null;
  weightClassName: string | null;
  weightLimitText: string | null;
  sportTitle: string | null;
};

export type ResolveEventDivisionResult =
  | {
      ok: true;
      division: ResolvedEventDivision;
      category: NormalizedCompetitionCategory;
    }
  | {
      ok: false;
      code:
        | "category_unknown"
        | "no_division_table"
        | "no_weight_match"
        | "ambiguous";
      reason: string;
      category: NormalizedCompetitionCategory;
    };

type ParsedLimit = {
  kg: number;
  type: "under" | "over";
};

function parseDivisionLimit(
  division: DivisionResolverCandidate,
): ParsedLimit | null {
  const fields = resolveEventDivisionWeightFields(division);
  const text = normalizeWeightLimitDisplayText(fields.weightLimitText);
  if (!text) return null;
  if (text.startsWith("+")) {
    const kg = Number.parseFloat(text.slice(1));
    if (!Number.isFinite(kg) || kg <= 0) return null;
    return { kg, type: "over" };
  }
  if (text.startsWith("-")) {
    const kg = Number.parseFloat(text.slice(1));
    if (!Number.isFinite(kg) || kg <= 0) return null;
    return { kg, type: "under" };
  }
  return null;
}

function genderMatches(
  divisionGender: string | null | undefined,
  athleteGender: "male" | "female",
): boolean {
  const raw = (divisionGender ?? "").trim();
  if (!raw || foldKey(raw) === "mixed" || foldKey(raw) === "혼성") return true;
  const parsed = parseApplicantGender(raw);
  if (parsed.ok) return parsed.gender === athleteGender;
  return foldKey(raw) === foldKey(athleteGender);
}

function sportKey(value: string): string {
  const folded = foldKey(value);
  for (const [enumKey, label] of Object.entries(DIVISION_TEMPLATE_SPORT_LABELS)) {
    if (folded === foldKey(enumKey) || folded === foldKey(label)) {
      return foldKey(label);
    }
  }
  return folded;
}

function sportMatches(
  division: DivisionResolverCandidate,
  discipline: string | null | undefined,
): boolean {
  const wanted = (discipline ?? "").trim();
  if (!wanted) return true;
  const wantedKey = sportKey(wanted);
  const title = sportKey(formatDivisionSportTitle(division) ?? "");
  const type = sportKey(division.sportType ?? "");
  return wantedKey === title || wantedKey === type;
}

function containsWeight(
  limit: ParsedLimit,
  applicationWeightKg: number,
): boolean {
  if (limit.type === "over") return applicationWeightKg >= limit.kg;
  return applicationWeightKg <= limit.kg;
}

function pickTightest(
  matches: Array<{ division: DivisionResolverCandidate; limit: ParsedLimit }>,
): DivisionResolverCandidate | "ambiguous" | null {
  const unders = matches.filter((m) => m.limit.type === "under");
  const overs = matches.filter((m) => m.limit.type === "over");
  const pool = unders.length > 0 ? unders : overs;
  if (pool.length === 0) return null;

  const targetKg =
    pool[0]!.limit.type === "under"
      ? Math.min(...pool.map((m) => m.limit.kg))
      : Math.max(...pool.map((m) => m.limit.kg));
  const tight = pool.filter((m) => m.limit.kg === targetKg);
  if (tight.length === 1) return tight[0]!.division;
  const ids = new Set(tight.map((m) => m.division.id));
  if (ids.size === 1) return tight[0]!.division;
  return "ambiguous";
}

function toResolved(division: DivisionResolverCandidate): ResolvedEventDivision {
  const fields = resolveEventDivisionWeightFields(division);
  const display = {
    sportType: division.sportType ?? null,
    ruleType: division.ruleType ?? null,
    gender: division.gender ?? null,
    ageGroup: division.ageGroup ?? null,
    weightClass: division.weightClass ?? null,
    weightClassName: fields.weightClassName,
    weightLimitText: fields.weightLimitText,
    skillLevel: division.skillLevel ?? null,
  };
  return {
    id: division.id,
    label: formatDivisionSearchLabel(display),
    ageGroup: division.ageGroup ?? null,
    weightClassName: fields.weightClassName,
    weightLimitText: fields.weightLimitText,
    sportTitle: formatDivisionSportTitle(display),
  };
}

export function resolveEventDivisionByApplicationWeight(
  input: ResolveEventDivisionInput,
): ResolveEventDivisionResult {
  const category = normalizeCompetitionCategory(input.competitionCategory);
  if (!input.competitionCategory.trim()) {
    return {
      ok: false,
      code: "category_unknown",
      reason: "경기구분이 없습니다.",
      category,
    };
  }
  if (category.status === "unknown") {
    const exact = input.divisions.filter((d) =>
      eventAgeGroupMatchesInput(d.ageGroup, category),
    );
    if (exact.length === 0) {
      return {
        ok: false,
        code: "category_unknown",
        reason: "경기구분 확인 필요",
        category,
      };
    }
  }

  const byGender = input.divisions.filter((d) =>
    genderMatches(d.gender, input.gender),
  );
  const byCategory = byGender.filter((d) =>
    eventAgeGroupMatchesInput(d.ageGroup, category),
  );
  if (byCategory.length === 0) {
    return {
      ok: false,
      code: "no_division_table",
      reason: "해당 경기구분·성별·종목의 체급표가 없습니다.",
      category,
    };
  }

  const bySport = byCategory.filter((d) => sportMatches(d, input.discipline));
  if (bySport.length === 0) {
    return {
      ok: false,
      code: "no_division_table",
      reason: "해당 경기구분·성별·종목의 체급표가 없습니다.",
      category,
    };
  }

  const eligible = bySport.flatMap((division) => {
    const limit = parseDivisionLimit(division);
    if (!limit) return [];
    if (!containsWeight(limit, input.applicationWeightKg)) return [];
    return [{ division, limit }];
  });

  const picked = pickTightest(eligible);
  if (picked === "ambiguous") {
    return {
      ok: false,
      code: "ambiguous",
      reason: "신청체중에 해당하는 체급이 여러 개입니다. 종목을 확인해 주세요.",
      category,
    };
  }
  if (!picked) {
    return {
      ok: false,
      code: "no_weight_match",
      reason: "신청체중에 맞는 체급이 없습니다.",
      category,
    };
  }

  return { ok: true, division: toResolved(picked), category };
}

export function formatResolvedDivisionPreview(
  division: ResolvedEventDivision,
): string {
  const name = division.weightClassName?.trim();
  const limit = division.weightLimitText?.trim();
  if (name && limit) return `${name} (${limit})`;
  return formatDivisionWeightChipLabel(division) ?? division.label;
}
