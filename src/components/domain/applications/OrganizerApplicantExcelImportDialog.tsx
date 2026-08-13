"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  analyzeOrganizerApplicantExcelAction,
  commitOrganizerApplicantExcelAction,
  downloadOrganizerApplicantExcelSampleAction,
} from "@/features/applications/actions";
import {
  APPLICANT_EXCEL_MAX_BYTES,
  APPLICANT_EXCEL_MAX_ROWS,
} from "@/lib/applicant-excel/columns";
import type {
  ApplicantExcelCommitResult,
  ApplicantExcelPreview,
  ApplicantExcelPreviewRow,
} from "@/lib/applicant-excel/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { cn } from "@/lib/utils";

type Step = "upload" | "preview" | "result";

function decisionClass(decision: string): string {
  if (decision === "create") return "bg-emerald-100 text-emerald-900";
  if (decision === "skip_existing") return "bg-amber-100 text-amber-900";
  return "bg-red-100 text-red-700";
}

export function OrganizerApplicantExcelTrigger({
  onOpen,
  className,
}: {
  onOpen: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={cn("h-9", className)}
      onClick={onOpen}
    >
      엑셀 일괄 등록
    </Button>
  );
}

export function OrganizerApplicantExcelImportDialog({
  eventId,
  open,
  onOpenChange,
}: {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ApplicantExcelPreview | null>(null);
  const [result, setResult] = useState<ApplicantExcelCommitResult | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStep("upload");
    setError(null);
    setFile(null);
    setPreview(null);
    setResult(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function downloadSample() {
    setError(null);
    const res = await downloadOrganizerApplicantExcelSampleAction(eventId);
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

  function analyze(selected: File) {
    setError(null);
    setFile(selected);
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("file", selected);
    startTransition(async () => {
      const res = await analyzeOrganizerApplicantExcelAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setPreview(res.data);
      setStep("preview");
    });
  }

  function commit() {
    if (!file || !preview) return;
    setError(null);
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("file", file);
    startTransition(async () => {
      const res = await commitOrganizerApplicantExcelAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setResult(res.data);
      setStep("result");
      router.refresh();
    });
  }

  const canCommit = Boolean(
    preview && preview.counts.error === 0 && preview.counts.create > 0,
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>선수 신청 엑셀 일괄 등록</DialogTitle>
          <DialogDescription>
            샘플의 2행 예시를 참고해 3행부터 작성하세요. 파일 선택만으로
            저장되지 않습니다.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="text-destructive rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {step === "upload" ? (
          <div className="space-y-4">
            <div className="space-y-2 rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3">
              <p className="text-sm text-matchon-text-secondary">
                샘플의 2행 예시를 참고해 3행부터 실제 선수를 입력하세요.
                예시행은 등록되지 않습니다.
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
                maxBytes={APPLICANT_EXCEL_MAX_BYTES}
                disabled={pending}
                busy={pending}
                file={file}
                hint={`.xlsx · 최대 ${Math.round(APPLICANT_EXCEL_MAX_BYTES / (1024 * 1024))}MB · ${APPLICANT_EXCEL_MAX_ROWS}명`}
                onFile={(selected) => analyze(selected)}
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
          <PreviewBody preview={preview} />
        ) : null}

        {step === "result" && result ? (
          <div className="space-y-2 text-sm">
            <p>등록 완료 {result.created}명</p>
            <p>이미 등록(건너뜀) {result.skipped}명</p>
            <p>실패 {result.failed}명</p>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-end">
          {step === "preview" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                disabled={pending}
                onClick={() => handleOpenChange(false)}
              >
                취소
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                disabled={pending}
                onClick={() => {
                  setStep("upload");
                  setPreview(null);
                }}
              >
                다시 선택
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9"
                disabled={pending || !canCommit}
                onClick={commit}
              >
                {pending
                  ? "등록 중…"
                  : preview
                    ? `${preview.counts.create}명 등록`
                    : "등록"}
              </Button>
            </>
          ) : null}
          {step === "result" ? (
            <Button
              type="button"
              size="sm"
              className="h-9"
              onClick={() => handleOpenChange(false)}
            >
              신청자 목록으로 돌아가기
            </Button>
          ) : null}
          {step === "upload" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
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

function PreviewBody({ preview }: { preview: ApplicantExcelPreview }) {
  const gymEntries = Object.entries(preview.gymCounts);
  return (
    <div className="space-y-3">
      <p className="text-sm text-matchon-text-secondary">
        {preview.fileName} · 총 {preview.totalRows}명 · 등록 예정{" "}
        {preview.counts.create}명 · 이미 등록 {preview.counts.skipExisting}명 ·
        오류 {preview.counts.error}명
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CountCard label="등록 가능" value={preview.counts.create} />
        <CountCard label="이미 등록" value={preview.counts.skipExisting} />
        <CountCard label="오류" value={preview.counts.error} />
        <CountCard label="전체" value={preview.totalRows} />
      </div>
      {gymEntries.length > 0 ? (
        <p className="text-xs text-matchon-text-secondary">
          {gymEntries.map(([name, n]) => `${name} ${n}`).join(" · ")}
        </p>
      ) : null}
      {preview.counts.error > 0 ? (
        <p className="text-sm text-red-700">
          오류 행이 있어 등록할 수 없습니다. Excel을 수정한 뒤 다시 올려 주세요.
        </p>
      ) : preview.counts.create === 0 ? (
        <p className="text-sm text-matchon-text-secondary">
          새로 등록할 선수가 없습니다.
        </p>
      ) : null}
      <div className="hidden max-h-[40vh] overflow-auto rounded-md border md:block">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 sticky top-0">
            <tr>
              {["상태", "선수명", "체육관", "전적", "운동경력", "주민번호", "보험동의", "경기구분", "체급", "결과"].map(
                (h) => (
                  <th key={h} className="px-2 py-1.5 font-medium">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row) => (
              <PreviewTableRow key={row.excelRow} row={row} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2 md:hidden">
        {preview.rows.map((row) => (
          <PreviewMobileCard key={row.excelRow} row={row} />
        ))}
      </div>
    </div>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border border-[#E2E8F0] px-3 py-2">
      <p className="text-[11px] text-[#64748B]">{label}</p>
      <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
    </div>
  );
}

function PreviewTableRow({ row }: { row: ApplicantExcelPreviewRow }) {
  return (
    <tr className={cn(row.decision === "error" && "bg-red-50")}>
      <td className="px-2 py-1">
        <span className={cn("rounded px-1.5 py-0.5", decisionClass(row.decision))}>
          {row.decisionLabel}
        </span>
      </td>
      <td className="px-2 py-1">{row.fighterName || "—"}</td>
      <td className="px-2 py-1">{row.gymName || "—"}</td>
      <td className="px-2 py-1">{row.genderLabel || "—"}</td>
      <td className="px-2 py-1">{row.recordText || "—"}</td>
      <td className="px-2 py-1">{row.careerText || "—"}</td>
      <td className="px-2 py-1 tabular-nums">{row.insuranceRrnMasked || "—"}</td>
      <td className="px-2 py-1">{row.insuranceConsentLabel || "—"}</td>
      <td className="px-2 py-1">{row.ageGroup || "—"}</td>
      <td className="px-2 py-1">{row.weightClass || "—"}</td>
      <td className="px-2 py-1 text-red-700">
        {row.errors.join(", ") || row.divisionLabel || "—"}
      </td>
    </tr>
  );
}

function PreviewMobileCard({ row }: { row: ApplicantExcelPreviewRow }) {
  return (
    <div
      className={cn(
        "rounded-[10px] border px-3 py-2 text-xs",
        row.decision === "error" ? "border-red-200 bg-red-50" : "border-[#E2E8F0]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{row.fighterName || "(이름 없음)"}</span>
        <span className={cn("rounded px-1.5 py-0.5", decisionClass(row.decision))}>
          {row.decisionLabel}
        </span>
      </div>
      <p className="mt-1 text-matchon-text-secondary">
        {row.gymName} · {row.genderLabel} · {row.birthDate}
      </p>
      <p className="text-matchon-text-secondary">
        {row.recordText || "전적 없음"} · {row.careerText || "경력 없음"}
      </p>
      <p className="text-matchon-text-secondary">
        {row.insuranceRrnMasked || "주민번호 없음"} · {row.insuranceConsentLabel || "동의 없음"}
      </p>
      <p className="text-matchon-text-secondary">
        {row.ageGroup} {row.weightClass}
      </p>
      {row.errors.length > 0 ? (
        <p className="mt-1 text-red-700">{row.errors.join(", ")}</p>
      ) : null}
    </div>
  );
}
