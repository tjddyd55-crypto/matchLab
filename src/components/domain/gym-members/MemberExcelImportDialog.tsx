"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  analyzeGymMemberExcelImportAction,
  commitGymMemberExcelImportAction,
} from "@/features/gym-members/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  matchonFieldInputClass,
  matchonFieldSelectClass,
} from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

const CREATE_PLAN = "__create__";
const CREATE_MEMBER = "__create__";
const SKIP = "__skip__";

type ImportPreviewRow = {
  excelRow: number;
  name: string;
  phone: string;
  planName: string;
  planId: string | null;
  planNeedsCreate: boolean;
  decision: string;
  decisionLabel: string;
  matchedMemberId: string | null;
  matchedMemberName: string | null;
  amount: number | null;
  errors: string[];
  warnings: string[];
};

type ImportPreview = {
  batchId: string;
  fileName: string;
  totalRows: number;
  counts: {
    createMember: number;
    matchExisting: number;
    duplicateReview: number;
    skipIdempotent: number;
    error: number;
    planNeedsCreate: number;
    planNames: Record<string, number>;
    amountSum: number;
  };
  rows: ImportPreviewRow[];
  plans: { id: string; name: string; price: number }[];
};

type WizardStep =
  | "upload"
  | "preview"
  | "plan-mapping"
  | "duplicates"
  | "confirm"
  | "result";

type CommitResult = {
  success: number;
  failed: number;
  skipped: number;
  total: number;
};

const STEP_LABELS: Record<WizardStep, string> = {
  upload: "업로드",
  preview: "미리보기",
  "plan-mapping": "이용권 매핑",
  duplicates: "중복 처리",
  confirm: "확인",
  result: "결과",
};

function formatAmount(n: number): string {
  return n.toLocaleString("ko-KR");
}

function StepIndicator({ step }: { step: WizardStep }) {
  const order: WizardStep[] = [
    "upload",
    "preview",
    "plan-mapping",
    "duplicates",
    "confirm",
    "result",
  ];
  const idx = order.indexOf(step);
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px]">
      {order.map((s, i) => (
        <span
          key={s}
          className={cn(
            "rounded px-1.5 py-0.5 font-medium",
            i === idx
              ? "bg-matchon-primary text-white"
              : i < idx
                ? "bg-matchon-primary/15 text-matchon-primary"
                : "bg-muted text-muted-foreground",
          )}
        >
          {STEP_LABELS[s]}
        </span>
      ))}
    </div>
  );
}

function CountGrid({ preview }: { preview: ImportPreview }) {
  const { counts } = preview;
  const items = [
    { label: "전체", value: preview.totalRows },
    { label: "신규 생성", value: counts.createMember },
    { label: "기존 매칭", value: counts.matchExisting },
    { label: "중복 검토", value: counts.duplicateReview },
    { label: "오류", value: counts.error },
    { label: "이용권 생성 필요", value: counts.planNeedsCreate },
    { label: "강습료 합계", value: formatAmount(counts.amountSum) },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded border border-matchon-border bg-matchon-surface px-2.5 py-2"
        >
          <div className="text-[11px] text-matchon-text-secondary">
            {item.label}
          </div>
          <div className="text-sm font-semibold tabular-nums">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function MemberExcelImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<WizardStep>("upload");
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [planNameBindings, setPlanNameBindings] = useState<
    Record<string, string>
  >({});
  const [planBindingsConfirmed, setPlanBindingsConfirmed] = useState(false);
  const [memberBindings, setMemberBindings] = useState<
    Record<string, string>
  >({});
  const [createMissingGroups, setCreateMissingGroups] = useState(true);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  const uniquePlanNames = useMemo(() => {
    if (!preview) return [];
    return Object.keys(preview.counts.planNames).sort((a, b) =>
      a.localeCompare(b, "ko"),
    );
  }, [preview]);

  const duplicateRows = useMemo(() => {
    if (!preview) return [];
    return preview.rows.filter((r) => r.decision === "duplicate_review");
  }, [preview]);

  const importSummary = useMemo(() => {
    if (!preview) return { importable: 0, skipped: 0, failed: 0 };
    let importable = 0;
    let skipped = 0;
    let failed = 0;
    for (const row of preview.rows) {
      if (row.decision === "error") {
        failed += 1;
        continue;
      }
      if (row.decision === "skip_idempotent") {
        skipped += 1;
        continue;
      }
      if (row.decision === "duplicate_review") {
        const binding = memberBindings[String(row.excelRow)];
        if (binding === SKIP || !binding) {
          skipped += 1;
        } else {
          importable += 1;
        }
        continue;
      }
      importable += 1;
    }
    return { importable, skipped, failed };
  }, [preview, memberBindings]);

  function resetState() {
    setStep("upload");
    setError(null);
    setFile(null);
    setPreview(null);
    setPlanNameBindings({});
    setPlanBindingsConfirmed(false);
    setMemberBindings({});
    setCreateMissingGroups(true);
    setCommitResult(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState();
    onOpenChange(next);
  }

  function handleAnalyze(selected: File) {
    setFile(selected);
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("file", selected);
      const result = await analyzeGymMemberExcelImportAction(fd);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setPreview(result.data as ImportPreview);
      const initialBindings: Record<string, string> = {};
      for (const name of Object.keys(result.data.counts.planNames)) {
        const existing = result.data.plans.find((p) => p.name === name);
        if (existing) initialBindings[name] = existing.id;
      }
      setPlanNameBindings(initialBindings);
      setPlanBindingsConfirmed(false);
      setMemberBindings({});
      setStep("preview");
    });
  }

  function confirmPlanMappings() {
    setPlanNameBindings((prev) => {
      const next = { ...prev };
      for (const name of uniquePlanNames) {
        if (next[name]) continue;
        const existing = preview?.plans.find((p) => p.name === name);
        next[name] = existing?.id ?? CREATE_PLAN;
      }
      return next;
    });
    setPlanBindingsConfirmed(true);
    setStep(duplicateRows.length > 0 ? "duplicates" : "confirm");
  }

  function buildCommitPayload() {
    if (!preview || !file) return null;

    const planBindings: Record<string, string> = {};
    for (const row of preview.rows) {
      if (!row.planName) continue;
      const binding =
        planNameBindings[row.planName] ?? row.planId ?? CREATE_PLAN;
      if (binding) planBindings[String(row.excelRow)] = binding;
    }

    const resolvedMemberBindings: Record<string, string> = {};
    const skipRows: number[] = [];
    for (const row of preview.rows) {
      if (row.decision !== "duplicate_review") continue;
      const binding = memberBindings[String(row.excelRow)];
      if (!binding || binding === SKIP) {
        skipRows.push(row.excelRow);
      } else {
        resolvedMemberBindings[String(row.excelRow)] = binding;
      }
    }

    return { planBindings, memberBindings: resolvedMemberBindings, skipRows };
  }

  function handleCommit() {
    if (!preview || !file) return;
    const payload = buildCommitPayload();
    if (!payload) return;

    if (!planBindingsConfirmed) {
      setError("이용권 매핑을 확정해 주세요.");
      return;
    }

    const unmappedPlans = uniquePlanNames.filter((n) => !planNameBindings[n]);
    if (unmappedPlans.length > 0) {
      setError(`이용권 매핑이 필요합니다: ${unmappedPlans.join(", ")}`);
      return;
    }

    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("batchId", preview.batchId);
      fd.set("fileName", preview.fileName);
      fd.set("file", file);
      fd.set("planBindings", JSON.stringify(payload.planBindings));
      fd.set("memberBindings", JSON.stringify(payload.memberBindings));
      fd.set("skipRows", JSON.stringify(payload.skipRows));
      fd.set("createMissingGroups", createMissingGroups ? "true" : "false");

      const result = await commitGymMemberExcelImportAction(fd);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setCommitResult(result.data);
      setStep("result");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>엑셀 회원 업로드</DialogTitle>
          <DialogDescription>
            Excel 파일을 분석한 뒤 이용권·중복을 확인하고 등록합니다.
          </DialogDescription>
          {step !== "upload" ? <StepIndicator step={step} /> : null}
        </DialogHeader>

        {error ? (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {step === "upload" ? (
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Excel 파일 (.xlsx)</span>
              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className={matchonFieldInputClass}
                disabled={pending}
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) handleAnalyze(selected);
                }}
              />
            </label>
            <p className="text-xs text-matchon-text-secondary">
              파일을 선택하면 자동으로 분석합니다. 등록은 마지막 확인 단계에서
              진행됩니다.
            </p>
          </div>
        ) : null}

        {step === "preview" && preview ? (
          <div className="space-y-3">
            <p className="text-sm text-matchon-text-secondary">
              {preview.fileName} · {preview.totalRows}행
            </p>
            <CountGrid preview={preview} />
            {preview.counts.error > 0 ? (
              <div className="max-h-32 overflow-y-auto rounded border border-red-200 bg-red-50/50 p-2 text-xs">
                {preview.rows
                  .filter((r) => r.decision === "error")
                  .slice(0, 20)
                  .map((r) => (
                    <div key={r.excelRow} className="py-0.5">
                      {r.excelRow}행 {r.name || "(이름 없음)"}:{" "}
                      {r.errors.join(", ")}
                    </div>
                  ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "plan-mapping" && preview ? (
          <div className="space-y-3">
            <p className="text-xs text-matchon-text-secondary">
              Excel의 이용권명을 기존 상품에 연결하거나 새로 생성할 수 있습니다.
            </p>
            <div className="overflow-x-auto rounded border border-matchon-border">
              <table className="w-full min-w-[420px] text-left text-xs">
                <thead className="bg-matchon-surface text-matchon-text-secondary">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">이용권명</th>
                    <th className="px-2 py-1.5 font-medium">건수</th>
                    <th className="px-2 py-1.5 font-medium">매핑</th>
                  </tr>
                </thead>
                <tbody>
                  {uniquePlanNames.map((name) => {
                    const count = preview.counts.planNames[name] ?? 0;
                    const needsCreate = !preview.plans.some(
                      (p) => p.name === name,
                    );
                    return (
                      <tr
                        key={name}
                        className="border-t border-matchon-border"
                      >
                        <td className="px-2 py-1.5 font-medium">
                          {name}
                          {needsCreate ? (
                            <span className="ml-1 text-[10px] text-amber-700">
                              (신규)
                            </span>
                          ) : null}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">{count}</td>
                        <td className="px-2 py-1.5">
                          <select
                            className={cn(matchonFieldSelectClass, "w-full")}
                            value={planNameBindings[name] ?? ""}
                            onChange={(e) =>
                              setPlanNameBindings((prev) => ({
                                ...prev,
                                [name]: e.target.value,
                              }))
                            }
                          >
                            <option value="">선택…</option>
                            <option value={CREATE_PLAN}>
                              새 이용권으로 생성
                            </option>
                            {preview.plans.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({formatAmount(p.price)}원)
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {step === "duplicates" && preview ? (
          <div className="space-y-3">
            <p className="text-xs text-matchon-text-secondary">
              중복 의심 행마다 별도 회원 생성, 기존 회원 연결, 또는 건너뛰기를
              선택하세요. 미선택 시 건너뜁니다.
            </p>
            <div className="max-h-64 overflow-y-auto rounded border border-matchon-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-matchon-surface text-matchon-text-secondary">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">행</th>
                    <th className="px-2 py-1.5 font-medium">회원</th>
                    <th className="px-2 py-1.5 font-medium">연락처</th>
                    <th className="px-2 py-1.5 font-medium">처리</th>
                  </tr>
                </thead>
                <tbody>
                  {duplicateRows.map((row) => (
                    <tr
                      key={row.excelRow}
                      className="border-t border-matchon-border"
                    >
                      <td className="px-2 py-1.5 tabular-nums">
                        {row.excelRow}
                      </td>
                      <td className="px-2 py-1.5">{row.name}</td>
                      <td className="px-2 py-1.5">{row.phone}</td>
                      <td className="px-2 py-1.5">
                        <select
                          className={cn(matchonFieldSelectClass, "w-full min-w-[140px]")}
                          value={memberBindings[String(row.excelRow)] ?? ""}
                          onChange={(e) =>
                            setMemberBindings((prev) => ({
                              ...prev,
                              [String(row.excelRow)]: e.target.value,
                            }))
                          }
                        >
                          <option value="">건너뛰기 (기본)</option>
                          <option value={CREATE_MEMBER}>별도 회원 생성</option>
                          {row.matchedMemberId ? (
                            <option value={row.matchedMemberId}>
                              연결: {row.matchedMemberName}
                            </option>
                          ) : null}
                        </select>
                        {row.warnings.length > 0 ? (
                          <p className="mt-0.5 text-[10px] text-amber-700">
                            {row.warnings[0]}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {step === "confirm" && preview ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-2">
                <div className="text-[11px] text-emerald-800">등록 예정</div>
                <div className="font-bold tabular-nums text-emerald-900">
                  {importSummary.importable}
                </div>
              </div>
              <div className="rounded border border-amber-200 bg-amber-50 px-2 py-2">
                <div className="text-[11px] text-amber-800">건너뜀</div>
                <div className="font-bold tabular-nums text-amber-900">
                  {importSummary.skipped}
                </div>
              </div>
              <div className="rounded border border-red-200 bg-red-50 px-2 py-2">
                <div className="text-[11px] text-red-800">오류</div>
                <div className="font-bold tabular-nums text-red-900">
                  {importSummary.failed}
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={createMissingGroups}
                onCheckedChange={setCreateMissingGroups}
                aria-label="누락된 그룹 자동 생성"
              />
              Excel에 있는 그룹명이 없으면 자동 생성
            </label>
            <p className="text-xs text-matchon-text-secondary">
              오류 행과 미해결 중복·중복 의심 미선택 행은 자동으로
              건너뜁니다. 정상 행만 등록됩니다.
            </p>
          </div>
        ) : null}

        {step === "result" && commitResult ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-3">
                <div className="text-[11px] text-emerald-800">성공</div>
                <div className="text-lg font-bold tabular-nums text-emerald-900">
                  {commitResult.success}
                </div>
              </div>
              <div className="rounded border border-red-200 bg-red-50 px-2 py-3">
                <div className="text-[11px] text-red-800">실패</div>
                <div className="text-lg font-bold tabular-nums text-red-900">
                  {commitResult.failed}
                </div>
              </div>
              <div className="rounded border border-amber-200 bg-amber-50 px-2 py-3">
                <div className="text-[11px] text-amber-800">건너뜀</div>
                <div className="text-lg font-bold tabular-nums text-amber-900">
                  {commitResult.skipped}
                </div>
              </div>
            </div>
            <p className="text-sm text-matchon-text-secondary">
              전체 {commitResult.total}행 처리가 완료되었습니다.
            </p>
          </div>
        ) : null}

        <DialogFooter>
          {step === "preview" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("upload")}
                disabled={pending}
              >
                파일 다시 선택
              </Button>
              <Button
                type="button"
                onClick={() => setStep("plan-mapping")}
                disabled={pending}
              >
                이용권 매핑
              </Button>
            </>
          ) : null}

          {step === "plan-mapping" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("preview")}
                disabled={pending}
              >
                이전
              </Button>
              <Button
                type="button"
                onClick={confirmPlanMappings}
                disabled={
                  pending ||
                  uniquePlanNames.some((n) => !planNameBindings[n])
                }
              >
                매핑 확정
              </Button>
            </>
          ) : null}

          {step === "duplicates" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("plan-mapping")}
                disabled={pending}
              >
                이전
              </Button>
              <Button type="button" onClick={() => setStep("confirm")}>
                확인 단계
              </Button>
            </>
          ) : null}

          {step === "confirm" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setStep(
                    duplicateRows.length > 0 ? "duplicates" : "plan-mapping",
                  )
                }
                disabled={pending}
              >
                이전
              </Button>
              <Button
                type="button"
                onClick={handleCommit}
                disabled={pending || importSummary.importable === 0}
              >
                {pending ? "등록 중…" : "정상 행만 등록"}
              </Button>
            </>
          ) : null}

          {step === "result" ? (
            <Button type="button" onClick={() => handleOpenChange(false)}>
              닫기
            </Button>
          ) : null}

          {step === "upload" && pending ? (
            <span className="text-sm text-matchon-text-secondary">
              분석 중…
            </span>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MemberExcelImportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11"
        onClick={() => setOpen(true)}
      >
        엑셀 회원 업로드
      </Button>
      <MemberExcelImportDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
