"use client";

import { useState, useTransition } from "react";
import { enableKickboxingMemberTemplateAction } from "@/features/gym-members/profile-actions";
import { Button } from "@/components/ui/button";

export function EnableKickboxingTemplatePanel() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function enable() {
    setError(null);
    startTransition(async () => {
      const result = await enableKickboxingMemberTemplateAction();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm">
      <p className="font-medium text-amber-900">
        킥복싱 회원 정보 템플릿이 아직 활성화되지 않았습니다.
      </p>
      <p className="text-amber-900/90">
        활성화하면 회원 등록·수정 화면에 킥복싱 전용 항목이 표시됩니다. 기존
        회원 데이터는 변경되지 않습니다.
      </p>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="button" size="sm" disabled={pending} onClick={enable}>
        {pending ? "활성화 중…" : "킥복싱 템플릿 활성화"}
      </Button>
    </div>
  );
}
