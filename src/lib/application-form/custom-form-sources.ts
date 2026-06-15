export type CustomFormSourceOption = {
  value: string | null;
  label: string;
  group: string;
};

export const CUSTOM_FORM_SOURCE_OPTIONS: CustomFormSourceOption[] = [
  { value: null, label: "없음 (직접 입력)", group: "기본" },
  { value: "fighter.name", label: "선수명", group: "선수" },
  { value: "fighter.gender", label: "선수 성별", group: "선수" },
  { value: "fighter.birthDate", label: "선수 생년월일", group: "선수" },
  { value: "fighter.ageGroup", label: "선수 연령대", group: "선수" },
  { value: "fighter.weightKg", label: "선수 체중(kg)", group: "선수" },
  { value: "fighter.primarySport", label: "선수 주 종목", group: "선수" },
  { value: "gym.name", label: "체육관명", group: "체육관" },
  { value: "event.title", label: "대회명", group: "대회" },
  { value: "division.sportType", label: "경기구분 종목", group: "경기구분" },
  { value: "division.gender", label: "경기구분 성별", group: "경기구분" },
  { value: "division.ageGroup", label: "부문 연령대", group: "경기구분" },
  { value: "division.weightClass", label: "부문 체급", group: "경기구분" },
  { value: "guardian.name", label: "보호자 이름", group: "보호자" },
  { value: "guardian.phone", label: "보호자 연락처", group: "보호자" },
];

export const CUSTOM_FORM_SOURCE_VALUES = new Set(
  CUSTOM_FORM_SOURCE_OPTIONS.map((o) => o.value).filter((v): v is string => v != null),
);
