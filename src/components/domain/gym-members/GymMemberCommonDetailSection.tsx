"use client";

import { formatPhoneNumber } from "@/lib/phone";
import { formatUtcDateOnly } from "@/lib/date-only";
import {
  GymMemberCompactGrid,
  GymMemberFormSection,
} from "@/components/domain/gym-members/GymMemberFormLayout";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-matchon-border py-2 text-sm last:border-0">
      <span className="text-matchon-text-secondary">{label}</span>
      <span className="max-w-[65%] text-right font-medium text-matchon-text-primary break-words">
        {value}
      </span>
    </div>
  );
}

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
      <GymMemberCompactGrid cols={4}>
        <DetailRow label="이름" value={member.name} />
        <DetailRow label="휴대전화" value={formatPhoneNumber(member.phone)} />
        <DetailRow label="생년월일" value={fmtDate(member.birthDate)} />
        <DetailRow label="성별" value={member.gender ?? "—"} />
      </GymMemberCompactGrid>
      <GymMemberCompactGrid cols={4} className="mt-1">
        <div className="sm:col-span-2">
          <DetailRow
            label="주소"
            value={
              addressLine
                ? `${member.postalCode ? `(${member.postalCode}) ` : ""}${addressLine}`
                : "—"
            }
          />
        </div>
        <DetailRow label="이메일" value={member.email ?? "—"} />
        <DetailRow label="등록일" value={fmtDate(member.joinedAt)} />
      </GymMemberCompactGrid>
      <GymMemberCompactGrid cols={4} className="mt-1">
        <DetailRow label="회원번호" value={member.memberNumber} />
        {member.statusLabel ? (
          <DetailRow label="회원 상태" value={member.statusLabel} />
        ) : null}
        <DetailRow label="회원 등급" value={member.rankName ?? "—"} />
        <DetailRow
          label="보호자"
          value={
            [guardianName, guardianPhone ? formatPhoneNumber(guardianPhone) : ""]
              .filter(Boolean)
              .join(" · ") || "—"
          }
        />
      </GymMemberCompactGrid>
      <div className="mt-1">
        <DetailRow label="메모" value={member.memo ?? "—"} />
        {member.smsOptOut ? (
          <DetailRow label="출석 문자" value="수신 거부" />
        ) : null}
      </div>
    </GymMemberFormSection>
  );
}
