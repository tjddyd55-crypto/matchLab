import type { MemberSportTemplateCode } from "@/lib/enums";
import type { GymMemberDynamicFieldDefinition } from "@/lib/gym-member-profile/fields";

export type MemberSportTemplateWithFields = {
  id: string;
  code: MemberSportTemplateCode;
  name: string;
  sportType: string;
  active: boolean;
  version: number;
  fields: GymMemberDynamicFieldDefinition[];
};

export const KICKBOXING_TEMPLATE_ID = "cmskickboxingtpl001";
