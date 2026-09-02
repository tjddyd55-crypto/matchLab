import type { GymMemberDynamicFieldDefinition } from "@/lib/gym-member-profile/fields";

export type MemberSportTemplateWithFields = {
  id: string;
  code: string;
  /** Admin 내부 템플릿명 */
  name: string;
  /** 사용자 화면 종목 표시명 */
  displayName: string;
  sportType: string;
  active: boolean;
  version: number;
  fields: GymMemberDynamicFieldDefinition[];
};

export const KICKBOXING_TEMPLATE_ID = "cmskickboxingtpl001";
