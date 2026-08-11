"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DivisionTemplateDetailVM } from "@/lib/services/division-template.service";
import type { ApplyDivisionTemplateMode } from "@/lib/validators/division-template.validator";
import { DIVISION_TEMPLATE_SPORT_LABELS } from "@/lib/division-template/division-template-constants";
import { DivisionTemplatePreview } from "@/components/domain/division-templates/WeightClassRowsEditor";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import { applyDivisionTemplateToEventAction } from "@/features/division-templates/actions";

export function ApplyDivisionTemplatePanel({
  eventId,
  templates,
  templateDetails,
}: {
  eventId: string;
  templates: { id: string; title: string; sportType: string | null }[];
  templateDetails: DivisionTemplateDetailVM[];
}) {
  const router = useRouter();
  const { confirm } = useAppConfirmDialog();
  const [templateId, setTemplateId] = useState("");
  const [mode, setMode] = useState<ApplyDivisionTemplateMode>("append_skip");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => templateDetails.find((t) => t.id === templateId) ?? null,
    [templateDetails, templateId],
  );

  if (templates.length === 0) {
    return (
      <p className="text-muted-foreground text-xs leading-relaxed">
        저장된 체급표 템플릿이 없습니다.{" "}
        <Link href="/organizer/division-templates/new" className="underline">
          새 체급표 만들기
        </Link>
        에서 먼저 등록해 주세요.
      </p>
    );
  }

  async function apply() {
    setMessage(null);
    setError(null);
    if (!templateId) {
      setError("적용할 체급표 템플릿을 선택해 주세요.");
      return;
    }
    if (mode === "replace") {
      const ok = await confirm({
        title:
          "기존 경기구분을 모두 삭제한 뒤 체급표로 다시 생성합니다. 신청·대진표가 있는 경기구분이 있으면 취소됩니다. 계속할까요?",
        variant: "danger",
      });
      if (!ok) return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("templateId", templateId);
      fd.set("mode", mode);
      const res = await applyDivisionTemplateToEventAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      const parts = [
        `신규 경기구분 ${res.data.created}개 생성`,
        res.data.skippedDuplicates
          ? `동일 경기구분 스킵 ${res.data.skippedDuplicates}건`
          : null,
        res.data.removed ? `기존 경기구분 ${res.data.removed}개 삭제` : null,
      ].filter(Boolean);
      setMessage(parts.join(" · "));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/10 p-4 text-sm">
      <div>
        <div className="font-medium">체급표로 경기구분 생성</div>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          선택한 체급표 기준으로 대회 경기구분을 생성합니다.
          <br />
          이미 신청자가 있는 경기구분은 삭제하거나 덮어쓸 수 없습니다.
        </p>
      </div>

      <label className="block space-y-1 text-xs">
        <span className="text-muted-foreground">체급표 템플릿</span>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          disabled={pending}
          className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
        >
          <option value="">템플릿 선택…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
              {t.sportType
                ? ` (${DIVISION_TEMPLATE_SPORT_LABELS[t.sportType as keyof typeof DIVISION_TEMPLATE_SPORT_LABELS] ?? t.sportType})`
                : ""}
            </option>
          ))}
        </select>
      </label>

      {selected ? (
        <div className="rounded-md border bg-background p-3">
          <p className="mb-2 text-xs font-medium">미리보기</p>
          <DivisionTemplatePreview
            items={selected.items}
            sportType={selected.sportType}
          />
        </div>
      ) : null}

      <fieldset className="space-y-2 text-xs">
        <legend className="text-muted-foreground mb-1 font-medium">
          적용 방식
        </legend>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="radio"
            name={`apply-mode-${eventId}`}
            checked={mode === "append_skip"}
            onChange={() => setMode("append_skip")}
          />
          <span>
            기존 경기구분에 추가 · 동일 경기구분 건너뛰기
            <span className="text-muted-foreground block">
              sportType · gender · ageGroup · weightClass 기준
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="radio"
            name={`apply-mode-${eventId}`}
            checked={mode === "append_all"}
            onChange={() => setMode("append_all")}
          />
          <span>기존 경기구분에 추가 · 동일 경기구분도 새로 생성</span>
        </label>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="radio"
            name={`apply-mode-${eventId}`}
            checked={mode === "replace"}
            onChange={() => setMode("replace")}
          />
          <span>
            기존 경기구분 초기화 후 생성
            <span className="text-muted-foreground block">
              신청·대진표가 없을 때만 가능
            </span>
          </span>
        </label>
      </fieldset>

      <Button type="button" size="sm" onClick={apply} disabled={pending}>
        {pending ? "적용 중…" : "이 체급표로 경기구분 생성"}
      </Button>

      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-muted-foreground text-xs" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
