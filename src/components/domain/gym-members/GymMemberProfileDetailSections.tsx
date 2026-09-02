"use client";

import { formatGymMemberProfileValueForDisplay } from "@/lib/gym-member-profile/values";
import type { GymMemberDynamicFieldDefinition } from "@/lib/gym-member-profile/fields";
import type { MemberSportTemplateWithFields } from "@/lib/gym-member-profile/types";
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

function DynamicDetailGrid({
  fields,
  values,
}: {
  fields: GymMemberDynamicFieldDefinition[];
  values: Record<string, unknown>;
}) {
  return (
    <GymMemberCompactGrid cols={2} className="lg:grid-cols-4">
      {fields.map((field) => (
        <DetailRow
          key={field.stableKey}
          label={field.label}
          value={formatGymMemberProfileValueForDisplay(
            field.type,
            values[field.stableKey],
          )}
        />
      ))}
    </GymMemberCompactGrid>
  );
}

export function GymMemberProfileDetailSections({
  sportTemplate,
  customFields,
  sportValues,
  gymValues,
}: {
  sportTemplate: MemberSportTemplateWithFields | null;
  customFields: GymMemberDynamicFieldDefinition[];
  sportValues: Record<string, unknown>;
  gymValues: Record<string, unknown>;
}) {
  return (
    <>
      {sportTemplate && sportTemplate.fields.length > 0 ? (
        <GymMemberFormSection
          title={`${sportTemplate.name} 정보`}
          badge={sportTemplate.name}
        >
          <DynamicDetailGrid
            fields={sportTemplate.fields}
            values={sportValues}
          />
        </GymMemberFormSection>
      ) : null}

      {(customFields.length > 0 ||
        Object.keys(gymValues).length > 0) && (
        <GymMemberFormSection
          title="우리 체육관 추가 정보"
          badge="체육관 설정"
          subtleBg
        >
          {customFields.length > 0 ? (
            <DynamicDetailGrid fields={customFields} values={gymValues} />
          ) : (
            <p className="text-sm text-matchon-text-secondary">—</p>
          )}
        </GymMemberFormSection>
      )}
    </>
  );
}
