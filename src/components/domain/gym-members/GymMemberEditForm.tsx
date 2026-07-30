"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppDateInput } from "@/components/shared/AppDateInput";
import { AddressSearchField } from "@/components/shared/AddressSearchField";
import { GymMemberProfileImageUpload } from "@/components/domain/gym-members/GymMemberProfileImageUpload";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { Button, buttonVariants } from "@/components/ui/button";
import { updateGymMemberAction } from "@/features/gym-members/actions";
import { formatUtcDateOnly } from "@/lib/date-only";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export type GymMemberEditInitial = {
  name: string;
  phone: string;
  joinedAt: Date | string | null;
  birthDate: Date | string | null;
  gender: string | null;
  email: string | null;
  postalCode: string | null;
  address: string | null;
  addressDetail: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  primarySport: string | null;
  rankName: string | null;
  memo: string | null;
  smsOptOut: boolean;
};

function dateDefault(value: Date | string | null | undefined): string {
  if (!value) return "";
  return formatUtcDateOnly(value, "-");
}

export function GymMemberEditForm({
  memberId,
  initial,
  profileImageUrl = null,
}: {
  memberId: string;
  initial: GymMemberEditInitial;
  /** 서버에서 발급한 signed read URL (private 버킷) */
  profileImageUrl?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [profileImagePath, setProfileImagePath] = useState("");

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateGymMemberAction(memberId, formData);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push(`/gym/members/${memberId}`);
      router.refresh();
    });
  }

  return (
    <form action={submit} className="mx-auto max-w-2xl space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <GymMemberProfileImageUpload
        memberId={memberId}
        initialImageUrl={profileImageUrl}
        imagePath={profileImagePath}
        onImagePathChange={setProfileImagePath}
      />

      <label className="block space-y-1 text-sm">
        <span>이름 *</span>
        <input
          name="name"
          required
          defaultValue={initial.name}
          className={matchonFieldInputClass}
        />
      </label>
      <PhoneInput
        name="phone"
        label="휴대전화번호"
        required
        defaultValue={initial.phone}
      />
      <label className="block space-y-1 text-sm">
        <span>등록일</span>
        <AppDateInput
          name="joinedAt"
          defaultValue={dateDefault(initial.joinedAt)}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>생년월일</span>
        <AppDateInput
          name="birthDate"
          defaultValue={dateDefault(initial.birthDate)}
          disallowFuture
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>성별</span>
        <select
          name="gender"
          defaultValue={initial.gender ?? ""}
          className={matchonFieldInputClass}
        >
          <option value="">선택</option>
          <option value="남">남</option>
          <option value="여">여</option>
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span>이메일</span>
        <input
          name="email"
          type="email"
          defaultValue={initial.email ?? ""}
          className={matchonFieldInputClass}
        />
      </label>
      <AddressSearchField
        label="주소"
        addressName="address"
        detailName="addressDetail"
        postalName="postalCode"
        defaultAddress={initial.address ?? ""}
        defaultDetail={initial.addressDetail ?? ""}
        defaultPostal={initial.postalCode ?? ""}
      />
      <label className="block space-y-1 text-sm">
        <span>비상 연락처 이름</span>
        <input
          name="emergencyContactName"
          defaultValue={initial.emergencyContactName ?? ""}
          className={matchonFieldInputClass}
        />
      </label>
      <PhoneInput
        name="emergencyContactPhone"
        label="비상 연락처 전화"
        defaultValue={initial.emergencyContactPhone ?? ""}
      />
      <label className="block space-y-1 text-sm">
        <span>보호자명</span>
        <input
          name="guardianName"
          defaultValue={initial.guardianName ?? ""}
          className={matchonFieldInputClass}
        />
      </label>
      <PhoneInput
        name="guardianPhone"
        label="보호자 연락처"
        defaultValue={initial.guardianPhone ?? ""}
      />
      <label className="block space-y-1 text-sm">
        <span>주 수련 종목</span>
        <input
          name="primarySport"
          defaultValue={initial.primarySport ?? ""}
          className={matchonFieldInputClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>등급/띠</span>
        <input
          name="rankName"
          defaultValue={initial.rankName ?? ""}
          className={matchonFieldInputClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>메모</span>
        <textarea
          name="memo"
          rows={3}
          defaultValue={initial.memo ?? ""}
          className={cn(matchonFieldInputClass, "min-h-[5rem] py-2")}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="smsOptOut"
          value="true"
          defaultChecked={initial.smsOptOut}
        />
        SMS 수신 거부
      </label>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
        <Link
          href={`/gym/members/${memberId}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          취소
        </Link>
      </div>
    </form>
  );
}
