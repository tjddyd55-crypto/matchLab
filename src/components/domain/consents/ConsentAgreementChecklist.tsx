"use client";

type AgreementKey =
  | "privacyAgreed"
  | "riskAgreed"
  | "emergencyAgreed"
  | "resultDisclosureAgreed"
  | "photoVideoAgreed";

const LABELS: Record<AgreementKey, string> = {
  privacyAgreed:
    "선수 등록 및 대회 참가 관련 개인정보 수집 및 이용에 동의합니다.",
  riskAgreed:
    "경기 참가 및 훈련·경기 중 부상 위험 안내를 확인하였습니다.",
  emergencyAgreed: "필요 시 응급 조치에 동의합니다.",
  resultDisclosureAgreed:
    "대진표 및 경기 결과의 공개에 동의합니다.",
  photoVideoAgreed:
    "사진 및 영상 촬영·활용에 동의합니다.",
};

export type AgreementState = Record<AgreementKey, boolean>;

export const DEFAULT_AGREEMENT_STATE: AgreementState = {
  privacyAgreed: false,
  riskAgreed: false,
  emergencyAgreed: false,
  resultDisclosureAgreed: false,
  photoVideoAgreed: false,
};

export function ConsentAgreementChecklist({
  value,
  onChange,
}: {
  value: AgreementState;
  onChange: (next: AgreementState) => void;
}) {
  function toggle(key: AgreementKey) {
    onChange({ ...value, [key]: !value[key] });
  }

  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">필수 동의 항목</legend>
      {(Object.keys(LABELS) as AgreementKey[]).map((key) => (
        <label
          key={key}
          className="flex cursor-pointer gap-3 rounded-lg border border-matchon-border px-3 py-3 hover:bg-matchon-primary-light/20"
        >
          <input
            type="checkbox"
            checked={value[key]}
            onChange={() => toggle(key)}
            className="mt-0.5 size-5 shrink-0 rounded border-matchon-border accent-matchon-primary"
          />
          <span className="text-sm leading-snug">{LABELS[key]}</span>
        </label>
      ))}
    </fieldset>
  );
}
