"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { IntakeFormBuilder } from "@/components/domain/intake-forms/IntakeFormBuilder";
import { Button } from "@/components/ui/button";
import {
  createIntakeFormAction,
  updateIntakeFormAction,
} from "@/features/intake-forms/actions";
import type { IntakeFormFieldDefinition } from "@/lib/intake-form/fields";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";

export type IntakeFormEditorInitial = {
  title: string;
  description: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
  startsAt?: string | Date | null;
  closesAt?: string | Date | null;
  maxSubmissions?: number | null;
  completionMessage?: string | null;
  fields: IntakeFormFieldDefinition[];
};

function dateInputValue(d?: string | Date | null): string {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function IntakeFormEditorApp({
  mode,
  formId,
  initial,
  duplicateFromId,
}: {
  mode: "create" | "edit";
  formId?: string;
  initial?: IntakeFormEditorInitial;
  duplicateFromId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<"DRAFT" | "OPEN" | "CLOSED">(
    initial?.status ?? "DRAFT",
  );
  const [startsAt, setStartsAt] = useState(
    dateInputValue(initial?.startsAt),
  );
  const [closesAt, setClosesAt] = useState(
    dateInputValue(initial?.closesAt),
  );
  const [maxSubmissions, setMaxSubmissions] = useState(
    initial?.maxSubmissions != null ? String(initial.maxSubmissions) : "",
  );
  const [completionMessage, setCompletionMessage] = useState(
    initial?.completionMessage ?? "",
  );
  const [fields, setFields] = useState<IntakeFormFieldDefinition[]>(
    initial?.fields ?? [],
  );

  function save() {
    const payload = {
      title,
      description,
      status,
      startsAt: startsAt || null,
      closesAt: closesAt || null,
      maxSubmissions: maxSubmissions.trim() ? maxSubmissions : null,
      completionMessage: completionMessage.trim() || null,
      fields,
    };
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createIntakeFormAction(payload, duplicateFromId)
          : await updateIntakeFormAction(formId!, payload);
      if (!result.ok) {
        setMessage(result.error.message);
        return;
      }
      router.push(`/organizer/intake-forms/${result.data.formId}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {message ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}
      <section className="grid gap-4 rounded-xl border border-matchon-border bg-white p-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm md:col-span-2">
          <span className="font-semibold">제목</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={matchonFieldInputClass}
          />
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          <span className="font-semibold">설명</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={matchonFieldInputClass}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">상태</span>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "DRAFT" | "OPEN" | "CLOSED")
            }
            className={matchonFieldInputClass}
          >
            <option value="DRAFT">작성중</option>
            <option value="OPEN">접수중</option>
            <option value="CLOSED">마감</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">최대 신청 수</span>
          <input
            type="number"
            min={1}
            value={maxSubmissions}
            onChange={(e) => setMaxSubmissions(e.target.value)}
            placeholder="제한 없음"
            className={matchonFieldInputClass}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">접수 시작일</span>
          <input
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={matchonFieldInputClass}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">마감일</span>
          <input
            type="date"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            className={matchonFieldInputClass}
          />
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          <span className="font-semibold">완료 메시지</span>
          <input
            value={completionMessage}
            onChange={(e) => setCompletionMessage(e.target.value)}
            placeholder="신청이 완료되었습니다."
            className={matchonFieldInputClass}
          />
        </label>
      </section>
      <IntakeFormBuilder fields={fields} onChange={setFields} />
      <div className="flex gap-2">
        <Button type="button" disabled={pending} onClick={save}>
          {pending ? "저장 중…" : "저장"}
        </Button>
      </div>
    </div>
  );
}
