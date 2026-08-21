import type { EventDivisionDisplayInput } from "@/lib/event-division-fields";
import {
  formatDivisionMainLabel,
  formatDivisionSportTitle,
  formatDivisionWeightChipLabel,
  normalizeWeightLimitDisplayText,
  resolveEventDivisionWeightFields,
} from "@/lib/event-division-fields";
import {
  foldKey,
  parseApplicantGender,
  splitWeightClassInput,
} from "@/lib/applicant-excel/normalize";

export type ApplicantDivisionMatchInput = {
  gender: string;
  ageGroup: string;
  weightClass: string;
  weightLimit: string;
  sport: string;
};

export type ApplicantDivisionCandidate = EventDivisionDisplayInput & {
  id: string;
};

/** Excel·폼 체급 칸이 "기타"인지 (foldKey 기준). division-selection과 동일 규칙. */
export function isOtherDivisionLabel(raw: string | null | undefined): boolean {
  return foldKey(raw ?? "") === foldKey("기타");
}

function genderMatches(
  divisionGender: string | null,
  athleteGender: "male" | "female",
): boolean {
  const g = foldKey(divisionGender ?? "");
  if (!g || g === "mixed" || g === "혼성") return true;
  const parsed = parseApplicantGender(divisionGender ?? "");
  return parsed.ok && parsed.gender === athleteGender;
}

function ageGroupMatches(divisionAge: string | null, input: string): boolean {
  const a = foldKey(divisionAge ?? "");
  const b = foldKey(input);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function sportMatches(division: EventDivisionDisplayInput, sport: string): boolean {
  const wanted = foldKey(sport);
  if (!wanted) return true;
  const title = foldKey(formatDivisionSportTitle(division) ?? "");
  const type = foldKey(division.sportType ?? "");
  return title === wanted || type === wanted || title.includes(wanted);
}

function weightMatches(
  division: EventDivisionDisplayInput,
  weightClass: string,
  weightLimit: string,
): boolean {
  const fields = resolveEventDivisionWeightFields(division);
  const split = splitWeightClassInput(weightClass);
  const limitRaw = weightLimit.trim() || split.limitText || "";
  const limit = normalizeWeightLimitDisplayText(limitRaw);
  const nameKey = foldKey(split.name);
  const divName = foldKey(fields.weightClassName ?? "");
  const divLimit = normalizeWeightLimitDisplayText(fields.weightLimitText);
  const divLegacy = foldKey(fields.weightClass ?? "");

  if (limit && divLimit && foldKey(limit) === foldKey(divLimit)) {
    if (!nameKey) return true;
    if (!divName) return true;
    return (
      nameKey === divName ||
      nameKey.includes(divName) ||
      divName.includes(nameKey)
    );
  }
  if (nameKey && divName && nameKey === divName && !limit) return true;
  if (nameKey && divLegacy && nameKey === divLegacy) return true;

  const inputFold = foldKey(`${weightClass} ${weightLimit}`);
  if (!inputFold) return false;
  const chip = foldKey(formatDivisionWeightChipLabel(division) ?? "");
  const main = foldKey(formatDivisionMainLabel(division));
  return inputFold === chip || inputFold === main;
}

export function matchEventDivision(input: {
  row: ApplicantDivisionMatchInput;
  gender: "male" | "female";
  divisions: ApplicantDivisionCandidate[];
}): { ok: true; division: ApplicantDivisionCandidate } | { ok: false; reason: string } {
  if (isOtherDivisionLabel(input.row.weightClass)) {
    return {
      ok: false,
      reason: "기타 체급은 EventDivision 매칭 대상이 아닙니다.",
    };
  }

  const byGender = input.divisions.filter((d) =>
    genderMatches(d.gender, input.gender),
  );
  const byAge = byGender.filter((d) =>
    ageGroupMatches(d.ageGroup, input.row.ageGroup),
  );
  if (byAge.length === 0) {
    return {
      ok: false,
      reason: "체급표에 없는 경기구분/체급입니다.",
    };
  }
  const bySport = byAge.filter((d) => sportMatches(d, input.row.sport));
  const matched = bySport.filter((d) =>
    weightMatches(d, input.row.weightClass, input.row.weightLimit),
  );

  if (matched.length === 1) return { ok: true, division: matched[0]! };
  if (matched.length === 0) {
    return {
      ok: false,
      reason: "체급표에 없는 경기구분/체급입니다.",
    };
  }
  return {
    ok: false,
    reason: "중복 체급 설정을 확인해주세요.",
  };
}
