export type MemberGymSettingsV1 = {
  version: 1;
  joinLink: {
    defaultExpiresDays: number | null;
    defaultMaxUses: number | null;
    allowDuplicateApplication: boolean;
    guideMessage: string;
    completionMessage: string;
  };
  attachments: {
    requiredTypes: string[];
  };
  approval: {
    requireManualGymSelection: boolean;
    memberCodePrefix: string;
    memberCodePadding: number;
  };
  form: {
    requireRepresentativePhoto: boolean;
    requireBusinessRegistration: boolean;
  };
};

export const DEFAULT_MEMBER_GYM_SETTINGS: MemberGymSettingsV1 = {
  version: 1,
  joinLink: {
    defaultExpiresDays: 30,
    defaultMaxUses: null,
    allowDuplicateApplication: true,
    guideMessage:
      "체육관 가입 신청서입니다. 안내에 따라 작성해 주세요.",
    completionMessage: "신청이 접수되었습니다. 검토 후 연락드리겠습니다.",
  },
  attachments: {
    requiredTypes: [],
  },
  approval: {
    requireManualGymSelection: true,
    memberCodePrefix: "MG",
    memberCodePadding: 5,
  },
  form: {
    requireRepresentativePhoto: false,
    requireBusinessRegistration: false,
  },
};

export function parseMemberGymSettings(raw: unknown): MemberGymSettingsV1 {
  if (!raw || typeof raw !== "object") return DEFAULT_MEMBER_GYM_SETTINGS;
  const v = raw as Partial<MemberGymSettingsV1>;
  return {
    version: 1,
    joinLink: { ...DEFAULT_MEMBER_GYM_SETTINGS.joinLink, ...v.joinLink },
    attachments: {
      ...DEFAULT_MEMBER_GYM_SETTINGS.attachments,
      ...v.attachments,
    },
    approval: { ...DEFAULT_MEMBER_GYM_SETTINGS.approval, ...v.approval },
    form: { ...DEFAULT_MEMBER_GYM_SETTINGS.form, ...v.form },
  };
}
