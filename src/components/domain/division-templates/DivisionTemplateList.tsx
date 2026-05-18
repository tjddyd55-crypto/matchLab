"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DivisionTemplateDetailVM } from "@/lib/services/division-template.service";
import type { ActionResult } from "@/lib/action-result";
import { DivisionTemplateEditDialog } from "@/components/domain/division-templates/DivisionTemplateEditDialog";
import { Button } from "@/components/ui/button";
import { deleteDivisionTemplateAction } from "@/features/division-templates/actions";

export function DivisionTemplateList({
  templates,
}: {
  templates: DivisionTemplateDetailVM[];
}) {
  const router = useRouter();
  const [delState, delAction, delPending] = useActionState(
    deleteDivisionTemplateAction,
    null as ActionResult<{ ok: true }> | null,
  );

  useEffect(() => {
    if (delState?.ok === true) router.refresh();
  }, [delState, router]);

  if (templates.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        저장된 템플릿이 없습니다. 아래에서 새로 만들 수 있습니다.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {templates.map((t) => (
        <li
          key={t.id}
          className="flex flex-col gap-3 rounded-lg border bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <div className="font-medium">{t.title}</div>
            <div className="text-muted-foreground text-xs">
              항목 {t.items.length}개 · 마지막 수정{" "}
              {new Date(t.updatedAt).toLocaleString("ko-KR")}
            </div>
            {t.description ? (
              <p className="text-muted-foreground line-clamp-2 text-xs">
                {t.description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <DivisionTemplateEditDialog template={t} />
            <form
              action={delAction}
              className="inline"
              onSubmit={(e) => {
                if (!window.confirm("이 템플릿을 삭제할까요?")) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="templateId" value={t.id} />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={delPending}
              >
                삭제
              </Button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
