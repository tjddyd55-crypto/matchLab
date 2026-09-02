"use client";

import Link from "next/link";
import type { GymMemberDynamicFieldDefinition } from "@/lib/gym-member-profile/fields";
import type { MemberSportTemplateWithFields } from "@/lib/gym-member-profile/types";
import { GymMemberDynamicFieldInput } from "@/components/domain/gym-members/GymMemberDynamicFieldInput";
import {
  GymMemberCompactGrid,
  GymMemberFormSection,
} from "@/components/domain/gym-members/GymMemberFormLayout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GymMemberSportProfileSection({
  template,
  values = {},
}: {
  template: MemberSportTemplateWithFields;
  values?: Record<string, unknown>;
}) {
  if (template.fields.length === 0) return null;

  return (
    <GymMemberFormSection
      title={`${template.name} 정보`}
      badge={template.name}
      badgeClassName="bg-slate-100 text-slate-600"
    >
      <GymMemberCompactGrid cols={4}>
        {template.fields.map((field) => (
          <GymMemberDynamicFieldInput
            key={field.stableKey}
            field={field}
            namePrefix="sport"
            defaultValue={values[field.stableKey]}
          />
        ))}
      </GymMemberCompactGrid>
    </GymMemberFormSection>
  );
}

export function GymMemberCustomProfileSection({
  fields,
  values = {},
  settingsHref = "/gym/member-custom-fields",
}: {
  fields: GymMemberDynamicFieldDefinition[];
  values?: Record<string, unknown>;
  settingsHref?: string;
}) {
  return (
    <GymMemberFormSection
      title="우리 체육관 추가 정보"
      badge="체육관 설정"
      badgeClassName="bg-matchon-surface text-matchon-text-secondary"
      subtleBg
    >
      {fields.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-matchon-border px-3 py-2.5 text-sm text-matchon-text-secondary">
          <span>추가로 관리하는 항목이 없습니다.</span>
          <Link
            href={settingsHref}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            추가 항목 설정
          </Link>
        </div>
      ) : (
        <GymMemberCompactGrid cols={4}>
          {fields.map((field) => (
            <GymMemberDynamicFieldInput
              key={field.stableKey}
              field={field}
              namePrefix="gym"
              defaultValue={values[field.stableKey]}
            />
          ))}
        </GymMemberCompactGrid>
      )}
    </GymMemberFormSection>
  );
}
