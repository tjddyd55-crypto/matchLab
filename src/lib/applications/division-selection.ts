/**
 * 1차 신청 체급 선택 SSOT — REGISTERED(체급표) vs OTHER(기타).
 * 가짜 "기타" EventDivision을 만들지 않는다.
 */

import { foldKey } from "@/lib/applicant-excel/normalize";
import {
  matchEventDivision,
  type ApplicantDivisionCandidate,
} from "@/lib/applicant-excel/match-division";

export const DIVISION_SELECTION_OTHER_LABEL = "기타";

export type DivisionSelectionType = "REGISTERED" | "OTHER";

export type RegisteredDivisionSelection = {
  selectionType: "REGISTERED";
  divisionId: string;
  division: ApplicantDivisionCandidate;
  requestedDivisionText: null;
  reviewRequired: false;
};

export type OtherDivisionSelection = {
  selectionType: "OTHER";
  divisionId: null;
  division: null;
  requestedDivisionText: string;
  reviewRequired: true;
};

export type ResolvedDivisionSelection =
  | RegisteredDivisionSelection
  | OtherDivisionSelection;

export type DivisionSelectionResolveResult =
  | { ok: true; selection: ResolvedDivisionSelection }
  | { ok: false; error: string };

export function isOtherDivisionSelectionLabel(
  raw: string | null | undefined,
): boolean {
  return foldKey(raw ?? "") === foldKey(DIVISION_SELECTION_OTHER_LABEL);
}

export function resolveRegisteredDivisionById(input: {
  divisionId: string;
  divisions: ApplicantDivisionCandidate[];
}): DivisionSelectionResolveResult {
  const id = input.divisionId.trim();
  if (!id) {
    return { ok: false, error: "체급을 선택해 주세요." };
  }
  const division = input.divisions.find((d) => d.id === id);
  if (!division) {
    return { ok: false, error: "체급표에 없는 경기구분/체급입니다." };
  }
  return {
    ok: true,
    selection: {
      selectionType: "REGISTERED",
      divisionId: division.id,
      division,
      requestedDivisionText: null,
      reviewRequired: false,
    },
  };
}

/**
 * 성별 + 경기구분 + 체급 라벨로 EventDivision 정확히 1건 매칭.
 * 0건 / 2건 이상이면 오류 (임의 선택 금지).
 */
export function resolveRegisteredDivisionByLabels(input: {
  gender: "male" | "female";
  competitionCategory: string;
  weightClassLabel: string;
  sport?: string | null;
  divisions: ApplicantDivisionCandidate[];
}): DivisionSelectionResolveResult {
  const ageGroup = input.competitionCategory.trim();
  const weightClass = input.weightClassLabel.trim();
  if (!ageGroup) {
    return { ok: false, error: "경기구분을 입력해 주세요." };
  }
  if (!weightClass) {
    return { ok: false, error: "체급을 입력해 주세요." };
  }

  const matched = matchEventDivision({
    gender: input.gender,
    row: {
      gender: input.gender,
      ageGroup,
      weightClass,
      weightLimit: "",
      sport: (input.sport ?? "").trim(),
    },
    divisions: input.divisions,
  });

  if (!matched.ok) {
    return { ok: false, error: matched.reason };
  }

  return {
    ok: true,
    selection: {
      selectionType: "REGISTERED",
      divisionId: matched.division.id,
      division: matched.division,
      requestedDivisionText: null,
      reviewRequired: false,
    },
  };
}

/**
 * OTHER vs REGISTERED 통합 해석.
 * 체급 라벨이 "기타"이면 EventDivision lookup을 하지 않는다.
 */
export function resolveDivisionSelection(input: {
  gender: "male" | "female";
  competitionCategory: string;
  weightClassLabel: string;
  otherDetailText?: string | null;
  sport?: string | null;
  divisions: ApplicantDivisionCandidate[];
  /** UI에서 이미 선택한 EventDivision.id (있으면 라벨 매칭보다 우선) */
  registeredDivisionId?: string | null;
}): DivisionSelectionResolveResult {
  if (isOtherDivisionSelectionLabel(input.weightClassLabel)) {
    const text = (input.otherDetailText ?? "").trim();
    if (!text) {
      return {
        ok: false,
        error: "기타를 선택한 경우 체급 또는 요청사항을 입력해주세요.",
      };
    }
    return {
      ok: true,
      selection: {
        selectionType: "OTHER",
        divisionId: null,
        division: null,
        requestedDivisionText: text,
        reviewRequired: true,
      },
    };
  }

  const registeredId = (input.registeredDivisionId ?? "").trim();
  if (registeredId) {
    return resolveRegisteredDivisionById({
      divisionId: registeredId,
      divisions: input.divisions,
    });
  }

  return resolveRegisteredDivisionByLabels({
    gender: input.gender,
    competitionCategory: input.competitionCategory,
    weightClassLabel: input.weightClassLabel,
    sport: input.sport,
    divisions: input.divisions,
  });
}
