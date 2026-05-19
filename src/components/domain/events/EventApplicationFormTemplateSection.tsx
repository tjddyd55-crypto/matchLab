"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApplicationFormTemplateListItemVM } from "@/lib/services/application-form-template.service";
import { linkEventApplicationFormTemplateAction } from "@/features/application-form-templates/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [selected, setSelected] = useState(linkedTemplateId ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("applicationFormTemplateId", selected);
    const res = await linkEventApplicationFormTemplateAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    router.refresh();
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="text-lg font-semibold">공식 신청서 템플릿</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        체육관 공식 신청(PDF) 흐름에 사용할 템플릿을 연결합니다. 연결 후 체육관
        신청 화면에서 선수별 신청서·서명 절차가 열립니다.
      </p>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <form onSubmit={(e) => void onSave(e)} className="flex flex-wrap items-end gap-3">
        <label className="min-w-[240px] flex-1 space-y-1 text-sm">
          <span className="font-medium">신청서 템플릿</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
            )}
          >
            <option value="">연결 해제</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
                {t.organizerName ? ` (${t.organizerName})` : ""}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : "템플릿 연결 저장"}
        </Button>
      </form>
    </section>
  );
}
