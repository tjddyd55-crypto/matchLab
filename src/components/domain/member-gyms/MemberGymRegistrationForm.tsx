"use client";

import { GymJoinApplicationForm } from "@/components/domain/gym-join/GymJoinApplicationForm";
import type { MemberGymSettingsV1 } from "@/lib/member-gym/settings";

type GuideFile = {
  id: string;
  kind: string;
  originalFileName: string;
};

/** 협회 초대 체육관 가입 — GymJoinApplicationForm SSOT */
export function MemberGymRegistrationForm({
  token,
  organizerName,
  guideMessage,
  settings,
  guideFiles,
}: {
  token: string;
  organizerName: string;
  guideMessage: string;
  settings: MemberGymSettingsV1;
  guideFiles: GuideFile[];
}) {
  return (
    <GymJoinApplicationForm
      mode="association_invite"
      associationInvite={{
        token,
        organizerName,
        guideMessage,
        settings,
        guideFiles,
      }}
    />
  );
}
