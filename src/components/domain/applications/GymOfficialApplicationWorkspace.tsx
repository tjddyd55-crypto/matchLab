"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { GymApplicationWorkspaceVM } from "@/lib/services/application-batch.service";
import type { ApplicationDocumentRowVM } from "@/lib/services/application-document.service";
import type { EventApplicationFormDTO } from "@/lib/services/application.service";
import { createApplicationDocumentAction } from "@/features/application-documents/actions";
import { submitBatchAction } from "@/features/application-batches/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  draft: "작성 중",
  waiting_athlete_signature: "선수 서명 대기",
  waiting_guardian_signature: "보호자 동의 대기",
  completed: "작성 완료",
  submitted: "제출됨",
  rejected: "반려",
};

export function GymOfficialApplicationWorkspace({
  workspace,
  documents,
  divisions,
  fighters,
}: {
  workspace: GymApplicationWorkspaceVM;
  documents: ApplicationDocumentRowVM[];
  divisions: EventApplicationFormDTO["divisions"];
  fighters: EventApplicationFormDTO["fighters"];
}) {
  const router = useRouter();
  const batchId = workspace.batch?.id;
  const [fighterId, setFighterId] = useState("");
  const [divisionId, setDivisionId] = useState(divisions[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const documentFighterIds = useMemo(
    () => new Set(documents.map((d) => d.fighterId)),
    [documents],
  );

  const availableFighters = fighters.filter((f) => !documentFighterIds.has(f.id));

  if (!workspace.template || !batchId) {
    return null;
  }

  const batchSubmitted = workspace.batch?.status !== "draft";

  async function addDocument() {
    if (!batchId || !fighterId || !divisionId) return;
    setPending(true);
    setError(null);
    const fd = new FormData();
    fd.set("batchId", batchId);
    fd.set("fighterId", fighterId);
    fd.set("divisionId", divisionId);
    const res = await createApplicationDocumentAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setFighterId("");
    router.refresh();
  }

  async function submitBatch() {
    if (!batchId) return;
    setPending(true);
    setError(null);
    setSubmitMsg(null);
    const fd = new FormData();
    fd.set("batchId", batchId);
    const res = await submitBatchAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setSubmitMsg(`제출 완료 — 접수번호 ${res.data.documentNo}`);
    router.refresh();
  }

  async function copyUrl(url: string | null) {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      window.alert("링크가 복사되었습니다.");
    } catch {
      window.alert("복사에 실패했습니다.");
    }
  }

  return (
    <section className="space-y-6 rounded-xl border border-primary/30 bg-card p-4 md:p-6">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold">공식 신청서 (PDF)</h2>
        <p className="text-muted-foreground text-sm">
          템플릿: <strong className="text-foreground">{workspace.template.title}</strong>{" "}
          · 필드 {workspace.template.fieldCount}개 ·{" "}
          {workspace.template.originalPdfFileName}
        </p>
        <ul className="text-muted-foreground list-inside list-disc text-xs leading-relaxed">
          {workspace.policyNotice.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </header>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {submitMsg ? (
        <p className="text-emerald-700 text-sm dark:text-emerald-400" role="status">
          {submitMsg}
        </p>
      ) : null}

      {!batchSubmitted ? (
        <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">경기구분</span>
            <select
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm",
              )}
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">선수</span>
            <select
              value={fighterId}
              onChange={(e) => setFighterId(e.target.value)}
              className={cn(
                "border-input bg-background h-9 w-full rounded-md border px-3 text-sm",
              )}
            >
              <option value="">선택</option>
              {availableFighters.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.fighterCode})
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending || !fighterId}
              onClick={() => void addDocument()}
            >
              선수별 신청서 생성
            </Button>
          </div>
        </div>
      ) : null}

      {documents.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          아직 생성된 선수별 신청서가 없습니다. 선수와 경기구분을 선택한 뒤
          「선수별 신청서 생성」을 눌러 주세요.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {documents.map((doc) => (
            <li key={doc.id} className="space-y-2 p-4 text-sm">
              <DocRow doc={doc} onCopy={copyUrl} />
            </li>
          ))}
        </ul>
      )}

      {!batchSubmitted && documents.length > 0 ? (
        <>
          {documents.some((d) => d.status !== "completed") ? (
            <p className="text-amber-700 text-xs dark:text-amber-400">
              모든 선수의 서명·동의가 완료(completed)되어야 제출할 수 있습니다.
            </p>
          ) : null}
          <Button
            type="button"
            disabled={pending || documents.some((d) => d.status !== "completed")}
            onClick={() => void submitBatch()}
          >
            {pending ? "제출 중…" : "신청 묶음 제출"}
          </Button>
        </>
      ) : null}
    </section>
  );
}

function DocRow({
  doc,
  onCopy,
}: {
  doc: ApplicationDocumentRowVM;
  onCopy: (url: string | null) => Promise<void>;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">
            {doc.fighterName}{" "}
            <span className="text-muted-foreground font-normal">
              ({doc.fighterCode})
            </span>
          </p>
          <p className="text-muted-foreground text-xs">{doc.divisionLabel}</p>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
          {STATUS_LABEL[doc.status] ?? doc.status}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {doc.athleteSignUrl ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void onCopy(doc.athleteSignUrl)}
            >
              선수 서명 링크 복사
            </Button>
            <a
              href={doc.athleteSignUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center rounded-md px-3 text-sm underline-offset-4 hover:underline"
            >
              서명 페이지 열기
            </a>
          </>
        ) : null}
        {doc.guardianConsentUrl ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void onCopy(doc.guardianConsentUrl)}
            >
              보호자 동의 링크 복사
            </Button>
            <a
              href={doc.guardianConsentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center rounded-md px-3 text-sm underline-offset-4 hover:underline"
            >
              동의 페이지 열기
            </a>
          </>
        ) : null}
      </div>
      <p className="text-muted-foreground text-xs">
        선수 서명: {doc.athleteSigned ? "완료" : "대기"}
        {doc.requiresGuardian
          ? ` · 보호자: ${doc.guardianSigned ? "완료" : "대기"}`
          : null}
      </p>
      {Object.keys(doc.previewValues).length > 0 ? (
        <dl className="text-muted-foreground grid gap-1 text-xs sm:grid-cols-2">
          {Object.entries(doc.previewValues).slice(0, 6).map(([k, v]) => (
            <div key={k}>
              <dt className="font-mono">{k}</dt>
              <dd>{v || "—"}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  );
}
