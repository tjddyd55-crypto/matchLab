"use client";

import { useRef, useState, useTransition } from "react";
import { IntakeFormFieldRenderer } from "@/components/domain/intake-forms/IntakeFormFieldRenderer";
import { Button } from "@/components/ui/button";
import { submitPublicIntakeFormAction } from "@/features/intake-forms/actions";
import type { IntakeFormFieldView } from "@/components/domain/intake-forms/IntakeFormFieldRenderer";

const SUBMITTED_KEY = "intake-form-submitted:";

export function IntakeFormPublicForm({
  publicToken,
  title,
  description,
  fields,
  canSubmit,
  blockedMessage,
}: {
  publicToken: string;
  title: string;
  description: string;
  fields: IntakeFormFieldView[];
  canSubmit: boolean;
  blockedMessage?: string;
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [completionMessage, setCompletionMessage] = useState<string | null>(
    () =>
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem(SUBMITTED_KEY + publicToken)
        ? sessionStorage.getItem(SUBMITTED_KEY + publicToken)
        : null,
  );
  const [pending, startTransition] = useTransition();
  const submittedRef = useRef(false);

  function onFieldChange(stableKey: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [stableKey]: value }));
  }

  function submit() {
    if (submittedRef.current || completionMessage) return;
    startTransition(async () => {
      const result = await submitPublicIntakeFormAction(publicToken, answers);
      if (!result.ok) {
        setMessage(result.error.message);
        return;
      }
      submittedRef.current = true;
      const msg = result.data.completionMessage;
      setCompletionMessage(msg);
      try {
        sessionStorage.setItem(SUBMITTED_KEY + publicToken, msg);
      } catch {
        /* ignore */
      }
    });
  }

  if (completionMessage) {
    return (
      <div className="rounded-xl border border-matchon-border bg-white p-6 text-center">
        <p className="text-lg font-semibold text-matchon-text-primary">
          {completionMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-xl font-bold text-matchon-text-primary">{title}</h1>
        {description ? (
          <p className="text-sm text-matchon-text-secondary whitespace-pre-wrap">
            {description}
          </p>
        ) : null}
      </header>
      {!canSubmit ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {blockedMessage ?? "현재 신청할 수 없습니다."}
        </p>
      ) : (
        <form
          className="space-y-4 rounded-xl border border-matchon-border bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {fields.map((field) => (
            <IntakeFormFieldRenderer
              key={field.stableKey}
              field={field}
              value={answers[field.stableKey]}
              onChange={onFieldChange}
              disabled={pending}
            />
          ))}
          {message ? (
            <p className="text-destructive text-sm" role="alert">{message}</p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? "제출 중…" : "신청하기"}
          </Button>
        </form>
      )}
    </div>
  );
}
