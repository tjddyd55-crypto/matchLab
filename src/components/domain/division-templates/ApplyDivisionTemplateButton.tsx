"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { applyDivisionTemplateToEventAction } from "@/features/division-templates/actions";

export function ApplyDivisionTemplateButton({
  eventId,
  templates,
}: {
  eventId: string;
  templates: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (templates.length === 0) {
    return (
      <p className="text-muted-foreground text-xs leading-relaxed">
        저장된 체급표 템플릿이 없습니다.{" "}
        <Link href="/organizer/division-templates" className="underline">
          템플릿 관리
        </Link>
        에서 먼저 만들어 주세요.
      </p>
    );
  }

  function apply() {
    setMessage(null);
    if (!templateId) {
      setMessage("적용할 템플릿을 선택해 주세요.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("templateId", templateId);
      const res = await applyDivisionTemplateToEventAction(fd);
      if (!res.ok) {
        setMessage(res.error.message);
        return;
      }
      setMessage(
        `신규 부문 ${res.data.created}개 추가됨 · 동일 부문 스킵 ${res.data.skippedDuplicates}건`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/10 p-3 text-sm">
      <div className="font-medium text-xs">템플릿으로 부문 일괄 추가</div>
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        이미 같은 조합의 부문이 있으면 건너뜁니다. 신청·대진표가 연결된 부문은
        삭제 정책이 그대로 적용됩니다.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          disabled={pending}
          className="border-input bg-background h-9 min-w-[200px] rounded-md border px-2 text-sm"
        >
          <option value="">템플릿 선택…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          onClick={apply}
          disabled={pending}
        >
          {pending ? "적용 중…" : "적용"}
        </Button>
      </div>
      {message ? (
        <p className="text-muted-foreground text-xs whitespace-pre-wrap">
          {message}
        </p>
      ) : null}
    </div>
  );
}
