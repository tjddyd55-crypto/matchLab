/**
 * 1차 선수 신청 validation SSOT.
 * 등록 링크 / Excel / 주최자 직접등록이 동일 규칙을 사용한다.
 */

import { birthDateToUtc } from "@/lib/applicant-excel/normalize";
import type { ApplicantDivisionCandidate } from "@/lib/applicant-excel/match-division";
import { parseOptionalApplicationWeightKg } from "@/lib/applications/application-weight";
import {
  DIVISION_SELECTION_OTHER_LABEL,
  resolveDivisionSelection,
  type ResolvedDivisionSelection,
} from "@/lib/applications/division-selection";
import {
  buildRecordText,
  validateRecord,
  type StructuredRecord,
} from "@/lib/fighter/record";
import { isMinorBirthDate } from "@/lib/gym-member-self-registration/age";
import { validateKrMobile } from "@/lib/phone";

export type FirstStageDivisionSelectionInput =
  | {
      selectionType: "REGISTERED";
      divisionId: string;
      requestedDivisionText?: null;
    }
  | {
      selectionType: "OTHER";
      divisionId?: null;
      requestedDivisionText: string;
    }
  | {
      /** Excel 등 라벨 기반 — 체급 문자열로 REGISTERED/OTHER 판정 */
      weightClassLabel: string;
      otherDetailText?: string | null;
      registeredDivisionId?: string | null;
    };

export type FirstStageApplicationInput = {
  gymName: string;
  fighterName: string;
  gender: "male" | "female" | null;
  birthDate: string | null;
  phone: string;
  guardianPhone?: string | null;
  guardianName?: string | null;
  competitionCategory: string;
  divisionSelection: FirstStageDivisionSelectionInput;
  record: StructuredRecord | null;
  applicationWeightKg?: string | number | null;
  careerText?: string | null;
  memo?: string | null;
  sport?: string | null;
  divisions: ApplicantDivisionCandidate[];
};

export type FirstStageApplicationValidated = {
  gymName: string;
  fighterName: string;
  gender: "male" | "female";
  birthDateIso: string;
  phone: string;
  guardianPhone: string | null;
  guardianName: string | null;
  competitionCategory: string;
  selection: ResolvedDivisionSelection;
  record: StructuredRecord;
  recordText: string;
  applicationWeightKg: number | null;
  careerText: string | null;
  memo: string | null;
  isMinor: boolean;
};

export type FirstStageApplicationValidationResult =
  | { ok: true; value: FirstStageApplicationValidated }
  | { ok: false; errors: string[] };

function compact(raw: string | null | undefined): string {
  return (raw ?? "").trim().replace(/\s+/g, " ");
}

function resolveSelectionFromInput(
  input: FirstStageApplicationInput,
  gender: "male" | "female",
):
  | { ok: true; selection: ResolvedDivisionSelection }
  | { ok: false; error: string } {
  const sel = input.divisionSelection;

  if ("selectionType" in sel && sel.selectionType === "OTHER") {
    return resolveDivisionSelection({
      gender,
      competitionCategory: input.competitionCategory,
      weightClassLabel: DIVISION_SELECTION_OTHER_LABEL,
      otherDetailText: sel.requestedDivisionText,
      sport: input.sport,
      divisions: input.divisions,
    });
  }

  if ("selectionType" in sel && sel.selectionType === "REGISTERED") {
    return resolveDivisionSelection({
      gender,
      competitionCategory: input.competitionCategory,
      weightClassLabel: "",
      sport: input.sport,
      divisions: input.divisions,
      registeredDivisionId: sel.divisionId,
    });
  }

  if (!("weightClassLabel" in sel)) {
    return { ok: false, error: "체급을 입력해 주세요." };
  }

  return resolveDivisionSelection({
    gender,
    competitionCategory: input.competitionCategory,
    weightClassLabel: sel.weightClassLabel,
    otherDetailText: sel.otherDetailText,
    sport: input.sport,
    divisions: input.divisions,
    registeredDivisionId: sel.registeredDivisionId,
  });
}

/**
 * 1차 신청 공통 검증.
 * 오류 메시지는 제품 문서 한글 문구를 따른다.
 */
export function validateFirstStageApplication(
  input: FirstStageApplicationInput,
): FirstStageApplicationValidationResult {
  const errors: string[] = [];

  const gymName = compact(input.gymName);
  const fighterName = compact(input.fighterName);
  const competitionCategory = compact(input.competitionCategory);
  const phoneRaw = compact(input.phone);
  const guardianPhoneRaw = compact(input.guardianPhone ?? "");
  const guardianName = compact(input.guardianName ?? "") || null;
  const careerText = compact(input.careerText ?? "") || null;
  const memo = compact(input.memo ?? "") || null;

  if (!gymName) errors.push("체육관명을 입력해 주세요.");
  if (!fighterName) errors.push("선수명을 입력해 주세요.");
  if (!input.gender) errors.push("성별을 선택해 주세요.");
  if (!competitionCategory) errors.push("경기구분을 입력해 주세요.");

  if (!input.birthDate) {
    errors.push("생년월일을 입력해 주세요.");
  }

  let phoneNormalized: string | null = null;
  const phoneResult = validateKrMobile(phoneRaw);
  if (!phoneResult.ok) {
    errors.push(phoneRaw ? phoneResult.message : "연락처를 입력해 주세요.");
  } else {
    phoneNormalized = phoneResult.normalized;
  }

  let isMinor = false;
  if (input.birthDate) {
    try {
      const birthUtc = birthDateToUtc(input.birthDate);
      isMinor = isMinorBirthDate(birthUtc);
      if (isMinor && !guardianPhoneRaw) {
        errors.push("미성년자는 보호자 연락처가 필요합니다.");
      }
    } catch {
      errors.push("생년월일 형식이 올바르지 않습니다.");
    }
  }

  let guardianPhoneNormalized: string | null = null;
  if (guardianPhoneRaw) {
    const guardianPhoneResult = validateKrMobile(guardianPhoneRaw);
    if (!guardianPhoneResult.ok) {
      errors.push(guardianPhoneResult.message);
    } else {
      guardianPhoneNormalized = guardianPhoneResult.normalized;
    }
  }

  if (!input.record) {
    errors.push("전적(총전/승/무/패)을 입력해 주세요.");
  } else {
    const recordCheck = validateRecord(input.record);
    if (!recordCheck.ok) errors.push(recordCheck.error);
  }

  let weightKg: number | null = null;
  const weightParsed = parseOptionalApplicationWeightKg(input.applicationWeightKg);
  if (!weightParsed.ok) {
    errors.push(weightParsed.error);
  } else {
    weightKg = weightParsed.kg;
  }

  let selection: ResolvedDivisionSelection | null = null;
  if (input.gender && competitionCategory) {
    const resolved = resolveSelectionFromInput(input, input.gender);
    if (!resolved.ok) {
      errors.push(resolved.error);
    } else {
      selection = resolved.selection;
    }
  } else if (
    "weightClassLabel" in input.divisionSelection &&
    !compact(input.divisionSelection.weightClassLabel)
  ) {
    errors.push("체급을 입력해 주세요.");
  }

  if (
    errors.length > 0 ||
    !input.gender ||
    !input.birthDate ||
    !input.record ||
    !selection ||
    !phoneNormalized
  ) {
    return {
      ok: false,
      errors: errors.length > 0 ? errors : ["입력값을 확인해 주세요."],
    };
  }

  return {
    ok: true,
    value: {
      gymName,
      fighterName,
      gender: input.gender,
      birthDateIso: input.birthDate,
      phone: phoneNormalized,
      guardianPhone: guardianPhoneNormalized,
      guardianName,
      competitionCategory,
      selection,
      record: input.record,
      recordText: buildRecordText(input.record),
      applicationWeightKg: weightKg,
      careerText,
      memo,
      isMinor,
    },
  };
}
