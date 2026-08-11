"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { GymApplicationWorkspaceVM } from "@/lib/services/application-batch.service";
import type { ApplicationDocumentRowVM } from "@/lib/services/application-document.service";
import type { EventApplicationFormDTO } from "@/lib/services/application.service";
import { createApplicationDocumentAction } from "@/features/application-documents/actions";
import { submitBatchAction } from "@/features/application-batches/actions";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getApplicationDocumentStatusLabel,
  getSignatureConsentLabel,
  publicApplicationFieldSelectClass,
  resolveApplicationDocumentMatchonStatus,
  resolveSignatureConsentMatchonStatus,
} from "@/lib/ui/public-application-ui";

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
  const { alert } = useAppConfirmDialog();
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
      await alert({
        title: "복사 완료",
        description: "링크가 복사되었습니다.",
      });
    } catch {
      await alert({
        title: "처리 실패",
        description: "복사에 실패했습니다.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>공식 신청서 (PDF)</CardTitle>
        <CardDescription>
          템플릿: {workspace.template.title} · 필드 {workspace.template.fieldCount}개 ·{" "}
          {workspace.template.originalPdfFileName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ul className="text-muted-foreground list-inside list-disc text-xs leading-relaxed">
          {workspace.policyNotice.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        {error ? (
          <FeedbackMessage tone="error" role="alert">
            {error}
          </FeedbackMessage>
        ) : null}
        {submitMsg ? (
          <FeedbackMessage tone="success">{submitMsg}</FeedbackMessage>
        ) : null}

        {!batchSubmitted ? (
          <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">경기구분</span>
              <select
                value={divisionId}
                onChange={(e) => setDivisionId(e.target.value)}
                className={publicApplicationFieldSelectClass}
              >
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">선수</span>
              <select
                value={fighterId}
                onChange={(e) => setFighterId(e.target.value)}
                className={publicApplicationFieldSelectClass}
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
                size="field"
                disabled={pending || !fighterId}
                onClick={() => void addDocument()}
              >
                선수별 신청서 생성
              </Button>
            </div>
          </div>
        ) : null}

        {documents.length === 0 ? (
          <FeedbackMessage tone="info">
            아직 생성된 선수별 신청서가 없습니다. 선수와 경기구분을 선택한 뒤
            「선수별 신청서 생성」을 눌러 주세요.
          </FeedbackMessage>
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
          <div className="space-y-3">
            {documents.some((d) => d.status !== "completed") ? (
              <FeedbackMessage tone="warning">
                모든 선수의 서명·동의가 완료(completed)되어야 제출할 수 있습니다.
              </FeedbackMessage>
            ) : null}
            <Button
              type="button"
              size="field"
              className="w-full sm:w-auto"
              disabled={pending || documents.some((d) => d.status !== "completed")}
              onClick={() => void submitBatch()}
            >
              {pending ? "제출 중…" : "신청 묶음 제출"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
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
        <MatchonStatusBadge
          status={resolveApplicationDocumentMatchonStatus(doc.status)}
          label={getApplicationDocumentStatusLabel(doc.status)}
          size="sm"
        />
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
      <div className="flex flex-wrap gap-2">
        <MatchonStatusBadge
          status={resolveSignatureConsentMatchonStatus(doc.athleteSigned)}
          label={getSignatureConsentLabel(doc.athleteSigned, "signature")}
          size="sm"
        />
        {doc.requiresGuardian ? (
          <MatchonStatusBadge
            status={resolveSignatureConsentMatchonStatus(doc.guardianSigned)}
            label={getSignatureConsentLabel(doc.guardianSigned, "consent")}
            size="sm"
          />
        ) : null}
      </div>
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
