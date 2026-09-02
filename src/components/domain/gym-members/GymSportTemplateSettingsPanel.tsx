"use client";

import { useMemo, useState, useTransition } from "react";
import { saveGymSportTemplateAssignmentsAction } from "@/features/gym-members/profile-actions";
import { Button } from "@/components/ui/button";

export type GymSportTemplateAssignmentOption = {
  id: string;
  /** 사용자 화면 종목 표시명 (SSOT) */
  displayName: string;
  /** @deprecated use displayName — kept for backward compat */
  name: string;
  assigned: boolean;
  isActive: boolean;
};

export function GymSportTemplateSettingsPanel({
  options,
}: {
  options: GymSportTemplateAssignmentOption[];
}) {
  const initialSelected = useMemo(
    () => options.filter((o) => o.isActive).map((o) => o.id),
    [options],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelected);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggle(id: string) {
    setSaved(false);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveGymSportTemplateAssignmentsAction(selectedIds);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setSaved(true);
      window.location.reload();
    });
  }

  if (options.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-matchon-border px-3 py-2.5 text-sm text-matchon-text-secondary">
        사용 가능한 종목 템플릿이 없습니다. 시스템 관리자에게 문의해 주세요.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-matchon-border bg-matchon-surface/40 p-3 md:p-4">
      <div>
        <h2 className="text-base font-semibold text-matchon-text-primary">
          사용 종목
        </h2>
        <p className="mt-1 text-sm text-matchon-text-secondary">
          회원 등록·수정 화면에 표시할 종목 템플릿을 선택합니다. 종목 필드는
          시스템 템플릿으로 관리됩니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label
            key={opt.id}
            className="inline-flex items-center gap-1.5 rounded-lg border border-matchon-border bg-white px-2.5 py-1.5 text-sm"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(opt.id)}
              onChange={() => toggle(opt.id)}
            />
            {opt.displayName}
          </label>
        ))}
      </div>

      <p className="text-xs text-matchon-text-secondary">
        종목을 해제해도 기존 회원의 입력값은 보존됩니다. 다시 활성화하면 이전
        값이 표시됩니다.
      </p>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? (
        <p className="text-sm text-emerald-700">저장되었습니다.</p>
      ) : null}

      <Button type="button" size="sm" disabled={pending} onClick={save}>
        {pending ? "저장 중…" : "사용 종목 저장"}
      </Button>
    </div>
  );
}
