"use client";

import { formatGymMemberProfileValueForDisplay } from "@/lib/gym-member-profile/values";
import type { GymMemberDynamicFieldDefinition } from "@/lib/gym-member-profile/fields";
import {
  getMemberFieldGridSpan,
  getSportFieldGridSpan,
} from "@/lib/gym-member-profile/grid";
import type { MemberSportTemplateWithFields } from "@/lib/gym-member-profile/types";
import {
  GymMemberDetailItem,
  GymMemberFieldGrid,
  GymMemberFormSection,
} from "@/components/domain/gym-members/GymMemberFormLayout";

function DynamicDetailGrid({
  fields,
  values,
  useSportSpan,
}: {
  fields: GymMemberDynamicFieldDefinition[];
  values: Record<string, unknown>;
  useSportSpan?: boolean;
}) {
  return (
    <GymMemberFieldGrid>
      {fields.map((field) => (
        <GymMemberDetailItem
          key={field.stableKey}
          label={field.label}
          span={
            useSportSpan
              ? getSportFieldGridSpan(field.stableKey, field.type)
              : getMemberFieldGridSpan(field.type)
          }
          value={formatGymMemberProfileValueForDisplay(
            field.type,
            values[field.stableKey],
          )}
        />
      ))}
    </GymMemberFieldGrid>
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
            useSportSpan
          />
        </GymMemberFormSection>
      ) : null}

      {(customFields.length > 0 || Object.keys(gymValues).length > 0) && (
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
