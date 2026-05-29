"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GymApplicationWorkspaceVM } from "@/lib/services/application-batch.service";
import type { ApplicationDocumentRowVM } from "@/lib/services/application-document.service";
import type { EventApplicationFormDTO } from "@/lib/services/application.service";
import { createApplicationDocumentAction } from "@/features/application-documents/actions";
import { submitBatchAction } from "@/features/application-batches/actions";
import type { BuiltInFormFieldDefinition } from "@/lib/built-in-form/built-in-form-types";
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

function isManualInputField(field: BuiltInFormFieldDefinition): boolean {
  if (field.type === "signature" || field.type === "consentText") return false;
  if (field.source === "manual" || field.source.startsWith("manual.")) {
    return field.editable !== false;
  }
  return field.editable === true;
}

export function GymBuiltInApplicationWorkspace({
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
  const formFields = workspace.template?.formFields;
  const inputFields = useMemo(
    () => (formFields ?? []).filter(isManualInputField),
    [formFields],
  );

  const [fighterId, setFighterId] = useState("");
  const [divisionId, setDivisionId] = useState(divisions[0]?.id ?? "");
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const documentFighterIds = useMemo(
    () => new Set(documents.map((d) => d.fighterId)),
    [documents],
  );
  const availableFighters = fighters.filter((f) => !documentFighterIds.has(f.id));
  const selectedFighter = fighters.find((f) => f.id === fighterId);

  if (!workspace.template || !batchId) return null;

  const batchSubmitted = workspace.batch?.status !== "draft";
  const selectClass =
    "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm";

  async function addDocument() {
    if (!batchId || !fighterId || !divisionId) return;
    setPending(true);
    setError(null);
    const fd = new FormData();
    fd.set("batchId", batchId);
    fd.set("fighterId", fighterId);
    fd.set("divisionId", divisionId);
    fd.set("manualValuesJson", JSON.stringify(manualValues));
    const res = await createApplicationDocumentAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setFighterId("");
    setManualValues({});
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

  return (
    <section className="space-y-6 rounded-xl border border-primary/30 bg-card p-4 md:p-6">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold">자체 웹 신청폼</h2>
        <p className="text-muted-foreground text-sm">
          템플릿: <strong className="text-foreground">{workspace.template.title}</strong>{" "}
          · 항목 {workspace.template.fieldCount}개
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
        <p className="text-sm text-green-700 dark:text-green-400">{submitMsg}</p>
      ) : null}

      {!batchSubmitted ? (
        <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">선수</span>
            <select
              className={selectClass}
              value={fighterId}
              onChange={(e) => setFighterId(e.target.value)}
            >
              <option value="">선택</option>
              {availableFighters.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.fighterCode})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">신청 부문</span>
            <select
              className={selectClass}
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          {selectedFighter ? (
            <div className="md:col-span-2 rounded-md border bg-background px-3 py-2 text-xs">
              <p className="font-medium">선수 DB 정보 (자동 반영)</p>
              <p className="text-muted-foreground mt-1">
                {selectedFighter.name} · {selectedFighter.fighterCode}
              </p>
            </div>
          ) : null}

          {inputFields.map((field) => (
            <label key={field.id} className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium">
                {field.label}
                {field.required === true ? " *" : ""}
              </span>
              {field.type === "textarea" ? (
                <textarea
                  className={cn(selectClass, "min-h-[4rem] py-2")}
                  value={manualValues[field.id] ?? ""}
                  onChange={(e) =>
                    setManualValues((v) => ({
                      ...v,
                      [field.id]: e.target.value,
                    }))
                  }
                />
              ) : (
                <input
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  className={selectClass}
                  value={manualValues[field.id] ?? ""}
                  onChange={(e) =>
                    setManualValues((v) => ({
                      ...v,
                      [field.id]: e.target.value,
                    }))
                  }
                />
              )}
            </label>
          ))}

          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending || !fighterId || !divisionId}
              onClick={() => void addDocument()}
            >
              신청서 추가
            </Button>
            <p className="text-muted-foreground self-center text-xs">
              추가 후 선수·보호자 서명 링크를 공유하세요.
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">신청서 목록</h3>
        {documents.length === 0 ? (
          <p className="text-muted-foreground text-sm">아직 추가된 신청서가 없습니다.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {documents.map((doc) => (
              <li key={doc.id} className="space-y-2 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {doc.fighterName} · {doc.divisionLabel}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {STATUS_LABEL[doc.status] ?? doc.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {doc.athleteSignUrl ? (
                    <a
                      href={doc.athleteSignUrl}
                      className="text-primary underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      선수 서명
                      {doc.athleteSigned ? " ✓" : ""}
                    </a>
                  ) : null}
                  {doc.guardianConsentUrl ? (
                    <a
                      href={doc.guardianConsentUrl}
                      className="text-primary underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      보호자 동의
                      {doc.guardianSigned ? " ✓" : ""}
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!batchSubmitted && documents.length > 0 ? (
        <Button type="button" disabled={pending} onClick={() => void submitBatch()}>
          신청 묶음 제출
        </Button>
      ) : null}
    </section>
  );
}
