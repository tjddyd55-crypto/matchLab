"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GymMemberCommonInfoSection } from "@/components/domain/gym-members/GymMemberCommonInfoSection";
import {
  GymMemberCustomProfileSection,
  GymMemberSportProfileSection,
} from "@/components/domain/gym-members/GymMemberProfileSections";
import { GymMemberProfileImageUpload } from "@/components/domain/gym-members/GymMemberProfileImageUpload";
import {
  GymMemberFormShell,
  GymMemberStickyActionBar,
} from "@/components/domain/gym-members/GymMemberFormLayout";
import type { GymMemberDynamicFieldDefinition } from "@/lib/gym-member-profile/fields";
import type { MemberSportTemplateWithFields } from "@/lib/gym-member-profile/types";
import { updateGymMemberAction } from "@/features/gym-members/actions";
import { formatUtcDateOnly } from "@/lib/date-only";
import { buttonVariants } from "@/components/ui/button";
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
  memberNumber: string;
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
  sportTemplate = null,
  customFields = [],
  sportValues = {},
  gymValues = {},
}: {
  memberId: string;
  initial: GymMemberEditInitial;
  groups?: GroupOption[];
  profileImageUrl?: string | null;
  sportTemplate?: MemberSportTemplateWithFields | null;
  customFields?: GymMemberDynamicFieldDefinition[];
  sportValues?: Record<string, unknown>;
  gymValues?: Record<string, unknown>;
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
      className="space-y-0"
    >
      <GymMemberFormShell>
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

      <GymMemberCommonInfoSection
        initial={{
          name: initial.name,
          phone: initial.phone,
          birthDate: dateDefault(initial.birthDate),
          gender: initial.gender ?? "",
          email: initial.email ?? "",
          postalCode: initial.postalCode ?? "",
          address: initial.address ?? "",
          addressDetail: initial.addressDetail ?? "",
          joinedAt: dateDefault(initial.joinedAt),
          memberNumber: initial.memberNumber,
          rankName: initial.rankName ?? "",
          guardianName: guardian.name,
          guardianPhone: guardian.phone,
          memo: initial.memo ?? "",
          smsOptOut: initial.smsOptOut,
        }}
        showMemberNumber
        joinedRequired={false}
      />

      {groups.length > 0 ? (
        <section className="space-y-2 rounded-lg border border-matchon-border p-3">
          <h3 className="text-sm font-semibold">회원 그룹</h3>
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
        </section>
      ) : null}

      {sportTemplate ? (
        <GymMemberSportProfileSection
          template={sportTemplate}
          values={sportValues}
        />
      ) : null}

      <GymMemberCustomProfileSection
        fields={customFields}
        values={gymValues}
      />

      <div className="flex justify-end gap-2 pb-2 md:hidden">
        <Link
          href={`/gym/members/${memberId}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          취소
        </Link>
      </div>

      <GymMemberStickyActionBar pending={pending} submitLabel="저장" />
      </GymMemberFormShell>
    </form>
  );
}
