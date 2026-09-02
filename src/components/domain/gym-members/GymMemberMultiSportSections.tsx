"use client";

import { useMemo, useState } from "react";
import type { MemberSportTemplateWithFields } from "@/lib/gym-member-profile/types";
import { GymMemberSportProfileSection } from "@/components/domain/gym-members/GymMemberProfileSections";
import { GymMemberFormSection } from "@/components/domain/gym-members/GymMemberFormLayout";

function resolveDefaultSelectedIds(
  sportTemplates: MemberSportTemplateWithFields[],
  defaultSelectedIds?: string[],
): string[] {
  if (defaultSelectedIds && defaultSelectedIds.length > 0) {
    const allowed = new Set(sportTemplates.map((t) => t.id));
    return defaultSelectedIds.filter((id) => allowed.has(id));
  }
  return sportTemplates.map((t) => t.id);
}

export function GymMemberMultiSportSections({
  sportTemplates,
  defaultSelectedIds,
  sportValuesByTemplate = {},
}: {
  sportTemplates: MemberSportTemplateWithFields[];
  defaultSelectedIds?: string[];
  sportValuesByTemplate?: Record<string, Record<string, unknown>>;
}) {
  const initialIds = useMemo(
    () => resolveDefaultSelectedIds(sportTemplates, defaultSelectedIds),
    [sportTemplates, defaultSelectedIds],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);

  if (sportTemplates.length === 0) return null;

  function toggleTemplate(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const selectedTemplates = sportTemplates.filter((t) =>
    selectedIds.includes(t.id),
  );

  return (
    <>
      <GymMemberFormSection
        title="회원 종목"
        badge="종목"
        badgeClassName="bg-slate-100 text-slate-600"
      >
        <p className="text-sm text-matchon-text-secondary">
          회원이 수련하는 종목을 1개 이상 선택해 주세요.
        </p>
        <div className="flex flex-wrap gap-2">
          {sportTemplates.map((t) => (
            <label
              key={t.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-matchon-border px-2.5 py-1.5 text-sm"
            >
              <input
                type="checkbox"
                name="memberSportTemplateIds"
                value={t.id}
                checked={selectedIds.includes(t.id)}
                onChange={() => toggleTemplate(t.id)}
              />
              {t.name}
            </label>
          ))}
        </div>
      </GymMemberFormSection>

      {selectedTemplates.map((template) => (
        <GymMemberSportProfileSection
          key={template.id}
          template={template}
          values={sportValuesByTemplate[template.id] ?? {}}
        />
      ))}
    </>
  );
}
