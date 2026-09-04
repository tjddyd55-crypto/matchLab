"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { scheduleEffectStateUpdate } from "@/lib/react/schedule-effect-state-update";
import { useRouter } from "next/navigation";
import type { DivisionTemplateDetailVM } from "@/lib/services/division-template.service";
import type {
  RebuildEventDivisionsPreviewVM,
  RebuildEventDivisionsResultVM,
} from "@/lib/services/event-division-rebuild.service";
import { DIVISION_TEMPLATE_SPORT_LABELS } from "@/lib/division-template/division-template-constants";
import { DivisionTemplatePreview } from "@/components/domain/division-templates/WeightClassRowsEditor";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  applyDivisionTemplateToEventAction,
  previewRebuildEventDivisionsFromTemplateAction,
  rebuildEventDivisionsFromTemplateAction,
} from "@/features/division-templates/actions";
import { resetEventBracketsAction } from "@/features/brackets/actions";
import { cn } from "@/lib/utils";

function PreflightStrip({
  preview,
}: {
  preview: RebuildEventDivisionsPreviewVM | null;
}) {
  if (!preview) return null;
  const items = [
    { label: "현재 경기구분", value: `${preview.currentDivisions}개` },
    { label: "유지", value: `${preview.keepDivisions}개` },
    { label: "신규", value: `${preview.newDivisions}개` },
    { label: "삭제 예정", value: `${preview.removedDivisions}개` },
    { label: "현재 경기", value: `${preview.currentMatches}경기` },
    { label: "신청자", value: `${preview.applicants}명` },
    {
      label: "삭제 경기구분 신청자",
      value: `${preview.removedApplicantTotal}명`,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md border bg-background px-2.5 py-2"
        >
          <p className="text-[11px] text-muted-foreground">{item.label}</p>
          <p className="text-sm font-semibold tabular-nums">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function ApplyDivisionTemplatePanel({
  eventId,
  templates,
  templateDetails,
}: {
  eventId: string;
  templates: { id: string; title: string; sportType: string | null }[];
  templateDetails: DivisionTemplateDetailVM[];
  /** @deprecated Application 재분류 UI 제거 — 호환용 */
  divisionsForResolve?: unknown;
}) {
  const router = useRouter();
  const { confirm, alert } = useAppConfirmDialog();
  const [templateId, setTemplateId] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<RebuildEventDivisionsPreviewVM | null>(
    null,
  );
  const [lastResult, setLastResult] =
    useState<RebuildEventDivisionsResultVM | null>(null);

  const selected = useMemo(
    () => templateDetails.find((t) => t.id === templateId) ?? null,
    [templateDetails, templateId],
  );

  useEffect(() => {
    scheduleEffectStateUpdate(() => {
      setPreview(null);
      setLastResult(null);
      setMessage(null);
      setError(null);
    });
    if (!templateId) return;

    let cancelled = false;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("templateId", templateId);
      const res = await previewRebuildEventDivisionsFromTemplateAction(fd);
      if (cancelled) return;
      if (!res.ok) {
        setPreview(null);
        return;
      }
      setPreview(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [eventId, templateId]);

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

  function applyAppend() {
    setMessage(null);
    setError(null);
    if (!templateId) {
      setError("적용할 체급표 템플릿을 선택해 주세요.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("templateId", templateId);
      fd.set("mode", "append_skip");
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
      ].filter(Boolean);
      setMessage(parts.join(" · "));
      router.refresh();
    });
  }

  async function resetMatchesOnly() {
    setMessage(null);
    setError(null);
    const ok = await confirm({
      title: "대진만 초기화할까요?",
      description: [
        "현재 생성된 경기와 선수 배정이 모두 삭제됩니다.",
        "경기구분과 신청자 정보는 그대로 유지됩니다.",
        "초기화 후 대진을 다시 생성할 수 있습니다.",
      ].join("\n"),
      confirmLabel: "대진 초기화",
      variant: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      const res = await resetEventBracketsAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setMessage("대진만 초기화했습니다. 신청자와 경기구분은 유지됩니다.");
      router.refresh();
    });
  }

  async function rebuildFromTemplate() {
    setMessage(null);
    setError(null);
    if (!templateId || !selected) {
      setError("적용할 체급표 템플릿을 선택해 주세요.");
      return;
    }
    if (preview?.blocked) {
      setError(
        preview.blockReason ??
          "새 템플릿을 적용할 수 없습니다. preview를 확인하세요.",
      );
      return;
    }

    const ok = await confirm({
      title: "새 경기구분 템플릿을 적용할까요?",
      description: [
        "새 경기구분 템플릿을 적용합니다.",
        "",
        "- 현재 대진표와 경기 편성은 초기화됩니다.",
        `- 삭제될 경기: ${preview?.currentMatches ?? 0}경기`,
        "- 신청자 자체는 삭제되지 않습니다.",
        "- 기존 신청 경기구분은 자동 변경하지 않습니다.",
        "- 동일한 경기구분은 기존 항목을 유지합니다.",
        "- 새 템플릿에서 사라지는 경기구분에 신청자가 있으면 적용할 수 없습니다.",
        "",
        `유지 ${preview?.keepDivisions ?? 0} · 신규 ${preview?.newDivisions ?? 0} · 삭제(미사용) ${preview?.removedDivisions ?? 0}`,
        "",
        `선택한 체급표: ${selected.title}`,
        "",
        "계속하시겠습니까?",
      ].join("\n"),
      confirmLabel: "새 템플릿 적용",
      variant: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("templateId", templateId);
      const res = await rebuildEventDivisionsFromTemplateAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        await alert(res.error.message);
        return;
      }
      setLastResult(res.data);
      setMessage(
        [
          `신청자 ${res.data.applicants}명 유지 (재분류 0)`,
          `경기구분 유지 ${res.data.keptDivisions}개`,
          `신규 ${res.data.createdDivisions}개`,
          `미사용 삭제 ${res.data.deletedUnusedDivisions}개`,
          `경기 삭제 ${res.data.deletedMatches}경기`,
        ].join(" · "),
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-muted/10 p-4 text-sm">
      <div>
        <div className="font-medium">체급표로 경기구분 생성</div>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          선택한 체급표 기준으로 대회 경기구분을 추가하거나, 아래에서 대진·경기구분을
          다시 구성할 수 있습니다. 신청 경기구분은 자동으로 재계산하지 않습니다.
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

      <div className="space-y-2 rounded-md border bg-background p-3">
        <p className="text-xs font-medium">체급표 추가 적용</p>
        <p className="text-muted-foreground text-xs">
          기존 경기구분에 추가 · 동일 경기구분은 건너뜀 · 신청자 변경 없음
        </p>
        <Button
          type="button"
          size="sm"
          onClick={applyAppend}
          disabled={pending || !templateId}
        >
          {pending ? "적용 중…" : "체급표로 경기구분 추가"}
        </Button>
      </div>

      <div className="space-y-3 rounded-md border border-amber-200/80 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div>
          <p className="text-sm font-medium">대진 / 경기구분 다시 구성</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            대진만 초기화하거나, 템플릿으로 경기구분 구조를 맞출 수 있습니다.
            신청 경기구분은 자동 재분류하지 않습니다.
          </p>
        </div>

        <PreflightStrip preview={preview} />

        {preview?.blockedByResults ? (
          <p className="text-destructive text-xs" role="alert">
            완료된 경기 결과가 있어 재구성할 수 없습니다. (
            {preview.matchesWithResults}건)
          </p>
        ) : null}

        {preview ? (
          <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs">
            {preview.blockedByRemovedApplicants ? (
              <>
                <p className="font-medium text-destructive" role="alert">
                  새 템플릿에서 사라지는 경기구분에 신청자가 있어 적용할 수
                  없습니다.
                </p>
                <p className="text-muted-foreground">
                  신청 경기구분은 자동으로 변경하지 않습니다.{" "}
                  <Link
                    href={`/organizer/events/${eventId}/applications`}
                    className="underline"
                  >
                    신청자 확인
                  </Link>
                  후 직접 수정하세요.
                </p>
                <ul className="space-y-1">
                  {preview.removedApplicantItems.map((item) => (
                    <li key={item.existingDivisionId ?? item.key}>
                      · {item.label}: {item.applicantCount}명
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-muted-foreground">
                신청자 {preview.applicants}명 · 신청 경기구분 자동 변경 없음 ·
                Application mutation 0
              </p>
            )}
          </div>
        ) : null}

        {lastResult ? (
          <p className="text-muted-foreground text-xs" role="status">
            최근 적용: 유지 {lastResult.keptDivisions} · 신규{" "}
            {lastResult.createdDivisions} · 미사용 삭제{" "}
            {lastResult.deletedUnusedDivisions} · 경기 삭제{" "}
            {lastResult.deletedMatches}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn("border-destructive/40 text-destructive")}
            disabled={pending}
            onClick={() => void resetMatchesOnly()}
          >
            {pending ? "처리 중…" : "대진만 초기화"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending || !templateId || Boolean(preview?.blocked)}
            onClick={() => void rebuildFromTemplate()}
          >
            {pending ? "처리 중…" : "새 템플릿으로 다시 구성"}
          </Button>
        </div>
      </div>

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
