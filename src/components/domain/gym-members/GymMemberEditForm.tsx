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
  groupIds?: string[];
};

type GroupOption = { id: string; name: string };

function dateDefault(value: Date | string | null | undefined): string {
  if (!value) return "";
  return formatUtcDateOnly(value, "-");
}

function resolveGuardian(initial: GymMemberEditInitial) {
  return {
    name:
      initial.guardianName?.trim() ||
      initial.emergencyContactName?.trim() ||
      "",
    phone:
      initial.guardianPhone?.trim() ||
      initial.emergencyContactPhone?.trim() ||
      "",
  };
}

export function GymMemberEditForm({
  memberId,
  initial,
  groups = [],
  profileImageUrl = null,
}: {
  memberId: string;
  initial: GymMemberEditInitial;
  groups?: GroupOption[];
  profileImageUrl?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [profileImagePath, setProfileImagePath] = useState("");
  const guardian = resolveGuardian(initial);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    initial.groupIds ?? [],
  );

  function toggleGroup(id: string) {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submit(formData: FormData) {
    setError(null);
    formData.set(
      "smsOptOut",
      formData.get("smsOptOut") === "true" ? "true" : "false",
    );
    for (const gid of selectedGroupIds) formData.append("groupIds", gid);
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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      className="mx-auto max-w-5xl space-y-6"
    >
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
      {profileImagePath ? (
        <input type="hidden" name="profileImagePath" value={profileImagePath} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-base font-semibold">기본 정보</h2>
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
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">보호자·등급·그룹</h2>
          <label className="block space-y-1 text-sm">
            <span>보호자(비상연락처) 이름</span>
            <input
              name="guardianName"
              defaultValue={guardian.name}
              className={matchonFieldInputClass}
            />
          </label>
          <PhoneInput
            name="guardianPhone"
            label="보호자(비상연락처) 전화"
            defaultValue={guardian.phone}
          />
          <label className="block space-y-1 text-sm">
            <span>회원 등급</span>
            <input
              name="rankName"
              defaultValue={initial.rankName ?? ""}
              className={matchonFieldInputClass}
            />
          </label>
          {groups.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">회원 그룹</legend>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <label
                    key={g.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-matchon-border px-2.5 py-1.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.includes(g.id)}
                      onChange={() => toggleGroup(g.id)}
                    />
                    {g.name}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <input type="hidden" name="groupIds" value="" />
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="smsOptOut"
              value="true"
              defaultChecked={initial.smsOptOut}
            />
            출석 문자 수신 거부
          </label>
        </section>
      </div>

      <label className="block space-y-1 text-sm">
        <span>메모</span>
        <textarea
          name="memo"
          rows={3}
          defaultValue={initial.memo ?? ""}
          className={cn(matchonFieldInputClass, "min-h-[5rem] py-2")}
        />
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
