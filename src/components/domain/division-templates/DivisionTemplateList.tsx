"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DivisionTemplateListItemVM } from "@/lib/services/division-template.service";
import type { ActionResult } from "@/lib/action-result";
import {
  DIVISION_TEMPLATE_SPORT_LABELS,
  type DivisionTemplateSportType,
} from "@/lib/division-template/division-template-constants";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteDivisionTemplateAction } from "@/features/division-templates/actions";
import { formatPublicDateTime } from "@/lib/date-display";

export function DivisionTemplateList({
  templates,
  showOrganizer = false,
}: {
  templates: DivisionTemplateListItemVM[];
  showOrganizer?: boolean;
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
        저장된 템플릿이 없습니다.
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
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/organizer/division-templates/${t.id}`}
                className="font-medium hover:underline"
              >
                {t.title}
              </Link>
              {!t.isActive ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                  비활성
                </span>
              ) : null}
            </div>
            {showOrganizer ? (
              <div className="text-muted-foreground text-xs">
                주최자: {t.organizerName}
              </div>
            ) : null}
            <div className="text-muted-foreground text-xs">
              {t.sportType
                ? `${
                    DIVISION_TEMPLATE_SPORT_LABELS[
                      t.sportType as DivisionTemplateSportType
                    ] ?? t.sportType
                  } · `
                : ""}
              체급 {t.itemCount}개 · 마지막 수정{" "}
              {formatPublicDateTime(t.updatedAt)}
            </div>
            {t.description ? (
              <p className="text-muted-foreground line-clamp-2 text-xs">
                {t.description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href={`/organizer/division-templates/${t.id}`}
              className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
            >
              수정
            </Link>
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
