"use client";

import { useMemo, useState, useTransition } from "react";
import type { DivisionTemplateItemInput } from "@/lib/validators/division-template.validator";
import {
  mergeWeightClassImportIntoItems,
  WEIGHT_CLASS_EXCEL_MAX_BYTES,
  type WeightClassImportPreview,
} from "@/lib/division-template/weight-class-excel";
import {
  analyzeWeightClassExcelAction,
  downloadWeightClassExcelSampleAction,
} from "@/features/division-templates/actions";
import { DIVISION_TEMPLATE_AGE_GROUPS } from "@/lib/division-template/division-template-constants";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Step = "upload" | "preview" | "result";

function decisionClass(decision: string): string {
  if (decision === "create") return "bg-emerald-100 text-emerald-900";
  if (decision === "skip_existing") return "bg-amber-100 text-amber-900";
  if (decision === "conflict") return "bg-orange-100 text-orange-900";
  return "bg-red-100 text-red-900";
}

export function DivisionTemplateExcelToolbar({
  sportType,
  items,
  onApplyItems,
  persistAfterApply,
}: {
  sportType: string;
  items: DivisionTemplateItemInput[];
  onApplyItems: (next: DivisionTemplateItemInput[]) => void;
  persistAfterApply?: (
    next: DivisionTemplateItemInput[],
  ) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [open, setOpen] = useState(false);

  async function downloadSample() {
    const res = await downloadWeightClassExcelSampleAction();
    if (!res.ok) {
      console.error("[weight-class-excel] sample download failed", res.error);
      return;
    }
    const bytes = Uint8Array.from(atob(res.data.base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.data.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void downloadSample()}
      >
        엑셀 샘플 다운로드
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        엑셀 업로드
      </Button>
      <DivisionTemplateExcelImportDialog
        open={open}
        onOpenChange={setOpen}
        sportType={sportType}
        existingItems={items}
        onConfirm={async (next) => {
          onApplyItems(next);
          if (persistAfterApply) {
            const res = await persistAfterApply(next);
            if (!res.ok) {
              return { ok: false, message: res.message ?? "저장 실패" };
            }
          }
          return { ok: true };
        }}
      />
    </div>
  );
}

export function DivisionTemplateExcelImportDialog({
  open,
  onOpenChange,
  sportType,
  existingItems,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sportType: string;
  existingItems: DivisionTemplateItemInput[];
  onConfirm: (
    next: DivisionTemplateItemInput[],
  ) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WeightClassImportPreview | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [analyzing, startAnalyze] = useTransition();

  function reset() {
    setStep("upload");
    setError(null);
    setFile(null);
    setPreview(null);
    setResultMsg(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function downloadSample() {
    setError(null);
    const res = await downloadWeightClassExcelSampleAction();
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    const bytes = Uint8Array.from(atob(res.data.base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.data.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onFile(selected: File) {
    setError(null);
    setFile(selected);
    setPreview(null);
    const fd = new FormData();
    fd.set("file", selected);
    fd.set("sportType", sportType);
    fd.set("existingItemsJson", JSON.stringify(existingItems));
    startAnalyze(async () => {
      const res = await analyzeWeightClassExcelAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setPreview(res.data);
      setStep("preview");
    });
  }

  const canCommit = useMemo(() => {
    if (!preview) return false;
    return preview.counts.create > 0 && preview.counts.error === 0 && preview.counts.conflict === 0;
  }, [preview]);

  async function confirm() {
    if (!preview) return;
    if (preview.counts.error > 0 || preview.counts.conflict > 0) {
      setError("오류/충돌 행을 먼저 수정해 주세요.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const merged = mergeWeightClassImportIntoItems({
        existingItems,
        preview,
      });
      const res = await onConfirm(merged);
      if (!res.ok) {
        setError(res.message ?? "반영에 실패했습니다.");
        return;
      }
      setResultMsg(
        `신규 ${preview.counts.create}개 반영 · 이미 존재 ${preview.counts.skipExisting}개 건너뜀`,
      );
      setStep("result");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle>체급표 Excel 일괄 등록</DialogTitle>
          <DialogDescription>
            샘플을 내려받아 작성한 뒤 업로드하세요. 파일 선택만으로 저장되지
            않습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b px-4 py-2 text-xs">
          {(
            [
              ["upload", "업로드"],
              ["preview", "미리보기"],
              ["result", "결과"],
            ] as const
          ).map(([id, label]) => (
            <span
              key={id}
              className={cn(
                "rounded px-2 py-1",
                step === id
                  ? "bg-matchon-brand-primary text-white"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-auto px-4 py-3">
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          {step === "upload" ? (
            <div className="space-y-4">
              <div className="space-y-2 rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3">
                <p className="text-sm text-matchon-text-secondary">
                  부문·성별·체급명·체중·기준·정렬순서를 작성한 뒤 업로드하세요.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  disabled={pending}
                  onClick={() => void downloadSample()}
                >
                  샘플 엑셀 다운로드
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#0F172A]">
                  Excel 파일 업로드
                </p>
                <FileDropzone
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  maxBytes={WEIGHT_CLASS_EXCEL_MAX_BYTES}
                  disabled={pending}
                  busy={pending || analyzing}
                  file={file}
                  hint={`.xlsx · 최대 ${Math.round(WEIGHT_CLASS_EXCEL_MAX_BYTES / (1024 * 1024))}MB`}
                  onFile={(selected) => void onFile(selected)}
                  onClear={() => {
                    setFile(null);
                    setError(null);
                  }}
                  onReject={(message) => setError(message)}
                />
              </div>
            </div>
          ) : null}

          {step === "preview" && preview ? (
            <div className="space-y-3">
              <p className="text-sm">
                {preview.fileName} · header {preview.headerRow}행 · 총{" "}
                {preview.totalRows}개
              </p>
              <div className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
                <Stat label="신규" value={preview.counts.create} tone="emerald" />
                <Stat
                  label="이미 존재"
                  value={preview.counts.skipExisting}
                  tone="amber"
                />
                <Stat label="충돌" value={preview.counts.conflict} tone="orange" />
                <Stat label="오류" value={preview.counts.error} tone="red" />
              </div>
              <div className="text-muted-foreground space-y-1 text-xs">
                {DIVISION_TEMPLATE_AGE_GROUPS.map((age) => {
                  const sc = preview.sectionCounts[age];
                  if (!sc) return null;
                  return (
                    <p key={age}>
                      {age}: 남 {sc.male} · 여 {sc.female}
                    </p>
                  );
                })}
              </div>
              <div className="max-h-[42vh] overflow-auto rounded border">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5">행</th>
                      <th className="px-2 py-1.5">상태</th>
                      <th className="px-2 py-1.5">부문</th>
                      <th className="px-2 py-1.5">성별</th>
                      <th className="px-2 py-1.5">체급명</th>
                      <th className="px-2 py-1.5">체중</th>
                      <th className="px-2 py-1.5">기준</th>
                      <th className="px-2 py-1.5">정렬</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr key={row.excelRow} className="border-t align-top">
                        <td className="px-2 py-1 tabular-nums">{row.excelRow}</td>
                        <td className="px-2 py-1">
                          <span
                            className={cn(
                              "inline-block rounded px-1.5 py-0.5",
                              decisionClass(row.decision),
                            )}
                          >
                            {row.decisionLabel}
                          </span>
                          {row.errors.length ? (
                            <p className="text-destructive mt-0.5">
                              {row.errors.join(", ")}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-2 py-1">{row.ageGroup}</td>
                        <td className="px-2 py-1">{row.genderLabel}</td>
                        <td className="px-2 py-1">{row.weightClassName}</td>
                        <td className="px-2 py-1 font-mono">
                          {row.weightLimitText ?? row.weightKg ?? ""}
                        </td>
                        <td className="px-2 py-1">{row.operatorLabel}</td>
                        <td className="px-2 py-1 tabular-nums">
                          {row.sortOrder ?? ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground text-xs">
                오류·충돌이 있으면 확정할 수 없습니다. 이미 존재 행은
                건너뜁니다.
              </p>
            </div>
          ) : null}

          {step === "result" ? (
            <p className="text-sm">{resultMsg ?? "반영되었습니다."}</p>
          ) : null}
        </div>

        <DialogFooter className="border-t px-4 py-3">
          {step === "preview" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("upload")}
                disabled={pending}
              >
                다시 선택
              </Button>
              <Button
                type="button"
                disabled={!canCommit || pending}
                onClick={() => void confirm()}
              >
                {pending ? "반영 중…" : "신규 행만 반영"}
              </Button>
            </>
          ) : null}
          {step === "result" ? (
            <Button type="button" onClick={() => handleOpenChange(false)}>
              닫기
            </Button>
          ) : null}
          {step === "upload" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              취소
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "orange" | "red";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : tone === "orange"
          ? "border-orange-200 bg-orange-50 text-orange-900"
          : "border-red-200 bg-red-50 text-red-900";
  return (
    <div className={cn("rounded border px-2 py-2", toneClass)}>
      <div className="text-[11px]">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
