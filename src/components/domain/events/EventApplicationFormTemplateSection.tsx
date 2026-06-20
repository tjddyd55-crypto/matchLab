"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApplicationFormTemplateListItemVM } from "@/lib/services/application-form-template.service";
import { linkEventApplicationFormTemplateAction } from "@/features/application-form-templates/actions";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function splitTemplates(templates: ApplicationFormTemplateListItemVM[]) {
  const global = templates.filter((t) => !t.organizerId);
  const mine = templates.filter((t) => t.organizerId);
  return { global, mine };
}

export function EventApplicationFormTemplateSection({
  eventId,
  linkedTemplateId,
  templates,
}: {
  eventId: string;
  linkedTemplateId: string | null;
  templates: ApplicationFormTemplateListItemVM[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(linkedTemplateId ?? "");
  const { global, mine } = useMemo(() => splitTemplates(templates), [templates]);

  const [saveState, saveAction, savePending] = useActionState(
    linkEventApplicationFormTemplateAction,
    null as ActionResult<{ ok: true }> | null,
  );

  useEffect(() => {
    if (saveState?.ok === true) {
      router.refresh();
    }
  }, [saveState, router]);

  const linked = templates.find((t) => t.id === linkedTemplateId) ?? null;
  const selectedGlobal = global.find((t) => t.id === selectedId);

  return (
    <section
      id="setup-application-form"
      className="scroll-mt-24 space-y-4 rounded-xl border bg-card p-4"
    >
      <h2 className="text-lg font-semibold">공식 신청서 템플릿</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        신청서가 필요 없으면 연결 해제를 선택하세요. 공용 템플릿과 내가 만든
        템플릿 중 하나를 대회에 연결할 수 있습니다.
      </p>

      {linked ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <p className="font-medium">연결됨: {linked.title}</p>
          <p className="text-muted-foreground text-xs">
            {linked.organizerId ? "내 템플릿" : "공용 템플릿"} · 방식:{" "}
            {linked.formModeLabel}
            {linked.originalPdfFileName
              ? ` · PDF: ${linked.originalPdfFileName}`
              : ""}{" "}
            · 필드 {linked.fieldCount}개
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">
          연결된 템플릿이 없습니다. (신청서 없음)
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href="/organizer/application-form-templates/new"
          className={cn(
            "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-muted",
          )}
        >
          새 신청서 템플릿 만들기
        </Link>
        {selectedGlobal ? (
          <Link
            href={`/organizer/application-form-templates/new?copyFrom=${selectedGlobal.id}`}
            className={cn(
              "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-muted",
            )}
          >
            선택한 공용 템플릿 복사
          </Link>
        ) : null}
        <Link
          href="/organizer/application-form-templates"
          className={cn(
            "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-muted",
          )}
        >
          템플릿 관리
        </Link>
      </div>

      {saveState?.ok === false ? (
        <p className="text-destructive text-sm" role="alert">
          {saveState.error.message}
        </p>
      ) : null}
      {saveState?.ok === true ? (
        <p className="text-sm text-green-700 dark:text-green-400" role="status">
          신청서 템플릿이 저장되었습니다.
        </p>
      ) : null}

      <form action={saveAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="eventId" value={eventId} />
        <label className="min-w-[240px] flex-1 space-y-1 text-sm">
          <span className="font-medium">신청서 템플릿</span>
          <select
            name="applicationFormTemplateId"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
            )}
          >
            <option value="">신청서 없음 (연결 해제)</option>
            {global.length > 0 ? (
              <optgroup label="공용 템플릿">
                {global.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} · {t.formModeLabel}
                    {!t.isActive ? " [비활성]" : ""}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {mine.length > 0 ? (
              <optgroup label="내 템플릿">
                {mine.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} · {t.formModeLabel}
                    {!t.isActive ? " [비활성]" : ""}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </label>
        <Button type="submit" disabled={savePending}>
          {savePending ? "저장 중…" : "템플릿 연결 저장"}
        </Button>
      </form>
    </section>
  );
}
