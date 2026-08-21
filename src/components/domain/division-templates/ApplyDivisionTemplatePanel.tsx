"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DivisionTemplateDetailVM } from "@/lib/services/division-template.service";
import type {
  RebuildEventDivisionsPreviewVM,
  RebuildEventDivisionsResultVM,
  RebuildPendingApplicantVM,
} from "@/lib/services/event-division-rebuild.service";
import { DIVISION_TEMPLATE_SPORT_LABELS } from "@/lib/division-template/division-template-constants";
import { DivisionTemplatePreview } from "@/components/domain/division-templates/WeightClassRowsEditor";
import { OrganizerResolveOtherDivisionDialog } from "@/components/domain/applications/OrganizerResolveOtherDivisionDialog";
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
    { label: "현재 경기", value: `${preview.currentMatches}경기` },
    { label: "신청자", value: `${preview.applicants}명` },
    { label: "새 경기구분 예상", value: `${preview.expectedNewDivisions}개` },
    { label: "자동 재배정 예상", value: `${preview.autoReassign}명` },
    { label: "확인 필요 예상", value: `${preview.needsReview}명` },
    { label: "미배정 예상", value: `${preview.unassigned}명` },
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

function PendingApplicantsList({
  eventId,
  rows,
  divisions,
  onResolved,
}: {
  eventId: string;
  rows: RebuildPendingApplicantVM[];
  divisions: Array<{
    id: string;
    label: string;
    gender: string | null;
    ageGroup: string | null;
    weightClass: string | null;
    weightClassName: string | null;
    weightLimitText: string | null;
  }>;
  onResolved?: (applicationId: string) => void;
}) {
  const [active, setActive] = useState<RebuildPendingApplicantVM | null>(null);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">확인 필요 · 미배정 신청자</p>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-2 font-medium">선수</th>
              <th className="py-2 pr-2 font-medium">체육관</th>
              <th className="py-2 pr-2 font-medium">신청 당시 체급</th>
              <th className="py-2 pr-2 font-medium">신청체중</th>
              <th className="py-2 pr-2 font-medium">후보</th>
              <th className="py-2 pr-2 font-medium">사유</th>
              <th className="py-2 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.applicationId} className="border-b align-top">
                <td className="py-2 pr-2 font-medium">{row.fighterName}</td>
                <td className="py-2 pr-2">{row.gymName}</td>
                <td className="py-2 pr-2">{row.appliedDivisionLabel}</td>
                <td className="py-2 pr-2 tabular-nums">
                  {row.applicationWeightKg != null
                    ? `${row.applicationWeightKg}kg`
                    : "—"}
                </td>
                <td className="py-2 pr-2">{row.candidateSummary}</td>
                <td className="py-2 pr-2">{row.reasonLabel}</td>
                <td className="py-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setActive(row)}
                  >
                    경기구분 지정
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 md:hidden">
        {rows.map((row) => (
          <li
            key={row.applicationId}
            className="rounded-lg border bg-background px-3 py-3"
          >
            <p className="font-medium">{row.fighterName}</p>
            <p className="text-muted-foreground text-xs">{row.gymName}</p>
            <p className="mt-1 text-xs">
              {row.appliedDivisionLabel}
              {row.applicationWeightKg != null
                ? ` · ${row.applicationWeightKg}kg`
                : ""}
            </p>
            <p className="mt-1 text-sm">{row.reasonLabel}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => setActive(row)}
            >
              경기구분 지정
            </Button>
          </li>
        ))}
      </ul>

      {active ? (
        <OrganizerResolveOtherDivisionDialog
          open={Boolean(active)}
          onOpenChange={(open) => {
            if (!open) setActive(null);
          }}
          eventId={eventId}
          applicationId={active.applicationId}
          fighterName={active.fighterName}
          gender={active.fighterGender}
          requestedDivisionText={active.appliedDivisionLabel}
          applicationWeightKg={active.applicationWeightKg}
          recordText={null}
          careerText={null}
          divisions={divisions}
          onSuccess={() => onResolved?.(active.applicationId)}
        />
      ) : null}
    </div>
  );
}

export function ApplyDivisionTemplatePanel({
  eventId,
  templates,
  templateDetails,
  divisionsForResolve = [],
}: {
  eventId: string;
  templates: { id: string; title: string; sportType: string | null }[];
  templateDetails: DivisionTemplateDetailVM[];
  divisionsForResolve?: Array<{
    id: string;
    label: string;
    gender: string | null;
    ageGroup: string | null;
    weightClass: string | null;
    weightClassName: string | null;
    weightLimitText: string | null;
  }>;
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
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const selected = useMemo(
    () => templateDetails.find((t) => t.id === templateId) ?? null,
    [templateDetails, templateId],
  );

  useEffect(() => {
    setPreview(null);
    setLastResult(null);
    setMessage(null);
    setError(null);
    setDismissedIds(new Set());
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
    if (preview?.blockedByResults) {
      setError(
        "경기 결과가 등록된 대진이 있어 새 체급표로 재구성할 수 없습니다.",
      );
      return;
    }

    const ok = await confirm({
      title: "새 체급표로 경기구분을 다시 구성할까요?",
      description: [
        "기존 대진과 경기구분이 초기화됩니다.",
        "신청자 정보는 삭제되지 않습니다.",
        "",
        `선택한 체급표: ${selected.title}`,
        "",
        "신청 선수는 새 경기구분 기준으로 다시 배정됩니다.",
        "자동으로 배정할 수 없는 선수는 '확인 필요' 상태로 남습니다.",
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
          `신청자 ${res.data.applicants}명 유지`,
          `자동 재배정 ${res.data.autoReassign}명`,
          `확인 필요 ${res.data.needsReview}명`,
          `미배정 ${res.data.unassigned}명`,
          `새 경기구분 ${res.data.newDivisions}개`,
          `경기 0경기`,
        ].join(" · "),
      );
      router.refresh();
    });
  }

  const pendingRows = (
    lastResult?.pendingApplicants ?? preview?.pendingApplicants ?? []
  ).filter((r) => !dismissedIds.has(r.applicationId));

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-muted/10 p-4 text-sm">
      <div>
        <div className="font-medium">체급표로 경기구분 생성</div>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          선택한 체급표 기준으로 대회 경기구분을 추가하거나, 아래에서 대진·경기구분을
          다시 구성할 수 있습니다.
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
          기존 경기구분에 추가 · 동일 경기구분은 건너뜀
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
            현재 대진만 초기화하거나, 선택한 체급표 템플릿 기준으로 경기구분을 새로
            구성할 수 있습니다.
          </p>
        </div>

        <PreflightStrip preview={preview} />

        {preview?.blockedByResults ? (
          <p className="text-destructive text-xs" role="alert">
            완료된 경기 결과가 있어 재구성할 수 없습니다. ({preview.matchesWithResults}
            건)
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
            disabled={pending || !templateId || Boolean(preview?.blockedByResults)}
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

      <PendingApplicantsList
        eventId={eventId}
        rows={pendingRows}
        divisions={divisionsForResolve}
        onResolved={(applicationId) => {
          setDismissedIds((prev) => new Set(prev).add(applicationId));
        }}
      />
    </div>
  );
}
