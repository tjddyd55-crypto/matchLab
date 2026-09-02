import type { GymMemberDynamicFieldType } from "@/generated/prisma";

export const GYM_MEMBER_DYNAMIC_FIELD_TYPE_LABEL: Record<
  GymMemberDynamicFieldType,
  string
> = {
  text: "한 줄 텍스트",
  textarea: "여러 줄 텍스트",
  number: "숫자",
  date: "날짜",
  select: "단일 선택",
  radio: "라디오 선택",
  checkbox: "체크박스",
  boolean: "예/아니오",
};
