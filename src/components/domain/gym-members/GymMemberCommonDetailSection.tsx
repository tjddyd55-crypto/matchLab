"use client";

import { formatPhoneNumber } from "@/lib/phone";
import { formatUtcDateOnly } from "@/lib/date-only";
import {
  GymMemberDetailItem,
  GymMemberFieldGrid,
  GymMemberFormSection,
} from "@/components/domain/gym-members/GymMemberFormLayout";

export type GymMemberCommonDetailData = {
  name: string;
  phone: string;
  birthDate?: Date | string | null;
  gender?: string | null;
  email?: string | null;
  postalCode?: string | null;
  address?: string | null;
  addressDetail?: string | null;
  joinedAt?: Date | string | null;
  memberNumber: string;
  rankName?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  memo?: string | null;
  smsOptOut?: boolean;
  statusLabel?: string;
};

function fmtDate(v: Date | string | null | undefined) {
  if (!v) return "—";
  return formatUtcDateOnly(v);
}

export function GymMemberCommonDetailSection({
  member,
}: {
  member: GymMemberCommonDetailData;
}) {
  const guardianName =
    member.guardianName?.trim() || member.emergencyContactName?.trim() || "";
  const guardianPhone =
    member.guardianPhone?.trim() || member.emergencyContactPhone?.trim() || "";
  const addressLine = [member.address, member.addressDetail]
    .filter(Boolean)
    .join(" ");

  return (
    <GymMemberFormSection title="기본 정보" badge="공통">
      <GymMemberFieldGrid>
        <GymMemberDetailItem label="이름" value={member.name} span={3} />
        <GymMemberDetailItem
          label="휴대전화"
          value={formatPhoneNumber(member.phone)}
          span={3}
        />
        <GymMemberDetailItem
          label="생년월일"
          value={fmtDate(member.birthDate)}
          span={3}
        />
        <GymMemberDetailItem
          label="성별"
          value={member.gender ?? "—"}
          span={3}
        />

        <GymMemberDetailItem
          label="주소"
          value={
            addressLine
              ? `${member.postalCode ? `(${member.postalCode}) ` : ""}${addressLine}`
              : "—"
          }
          span={6}
        />
        <GymMemberDetailItem
          label="이메일"
          value={member.email ?? "—"}
          span={3}
        />
        <GymMemberDetailItem
          label="등록일"
          value={fmtDate(member.joinedAt)}
          span={3}
        />

        <GymMemberDetailItem
          label="회원번호"
          value={member.memberNumber}
          span={3}
        />
        {member.statusLabel ? (
          <GymMemberDetailItem
            label="회원 상태"
            value={member.statusLabel}
            span={3}
          />
        ) : null}
        <GymMemberDetailItem
          label="회원 등급"
          value={member.rankName ?? "—"}
          span={3}
        />
        <GymMemberDetailItem
          label="보호자"
          value={
            [guardianName, guardianPhone ? formatPhoneNumber(guardianPhone) : ""]
              .filter(Boolean)
              .join(" · ") || "—"
          }
          span={3}
        />

        <GymMemberDetailItem label="메모" value={member.memo ?? "—"} span={12} />
        {member.smsOptOut ? (
          <GymMemberDetailItem label="출석 문자" value="수신 거부" span={3} />
        ) : null}
      </GymMemberFieldGrid>
    </GymMemberFormSection>
  );
}
