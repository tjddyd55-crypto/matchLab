"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import {
  executeMatchonMessageTestAction,
  previewMatchonMessageTestAction,
  createMatchonDraftTemplateAction,
} from "@/features/messaging/actions";

type TemplateOption = { id: string; name: string; channel: string };

export function MatchonMessagingTestConsole({
  templates,
}: {
  templates: TemplateOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<unknown>(null);
  const [dispatchId, setDispatchId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        테스트 모드 — 실제 문자나 알림톡은 발송되지 않습니다.
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {dispatchId ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          DRY_RUN 완료 · dispatchId={dispatchId}
        </p>
      ) : null}

      <form
        className="space-y-3 rounded-xl border border-matchon-border bg-white p-4"
        action={(fd) => {
          setError(null);
          setDispatchId(null);
          startTransition(async () => {
            const result = await previewMatchonMessageTestAction(fd);
            if (!result.ok) {
              setError(result.error.message);
              return;
            }
            setPreview(result.data);
          });
        }}
      >
        <h2 className="text-sm font-semibold">미리보기 / 테스트 실행</h2>
        <label className="block space-y-1 text-sm">
          <span>채널</span>
          <select name="channel" className={matchonFieldInputClass} defaultValue="sms">
            <option value="sms">SMS</option>
            <option value="lms">LMS</option>
            <option value="kakao_alimtalk">카카오 알림톡</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>테스트 전화번호</span>
          <input name="phone" className={matchonFieldInputClass} placeholder="01012345678" required />
        </label>
        <label className="block space-y-1 text-sm">
          <span>템플릿 (선택)</span>
          <select name="templateId" className={matchonFieldInputClass} defaultValue="">
            <option value="">없음</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.channel})
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>제목</span>
          <input name="subject" className={matchonFieldInputClass} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>본문</span>
          <textarea name="body" rows={4} className={matchonFieldInputClass} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>변수 JSON</span>
          <textarea
            name="variablesJson"
            rows={3}
            className={matchonFieldInputClass}
            placeholder='{"회원명":"홍길동"}'
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Idempotency key</span>
          <input name="idempotencyKey" className={matchonFieldInputClass} />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            미리보기
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => {
              const form = document.querySelector(
                "form",
              ) as HTMLFormElement | null;
              if (!form) return;
              const fd = new FormData(form);
              setError(null);
              startTransition(async () => {
                const result = await executeMatchonMessageTestAction(fd);
                if (!result.ok) {
                  setError(result.error.message);
                  return;
                }
                setDispatchId(result.data.dispatchId);
              });
            }}
          >
            테스트 실행
          </Button>
        </div>
      </form>

      {preview ? (
        <pre className="overflow-x-auto rounded-xl border border-matchon-border bg-matchon-surface p-3 text-xs">
          {JSON.stringify(preview, null, 2)}
        </pre>
      ) : null}

      <form
        className="space-y-3 rounded-xl border border-dashed border-matchon-border p-4"
        action={(fd) => {
          setError(null);
          startTransition(async () => {
            const result = await createMatchonDraftTemplateAction(fd);
            if (!result.ok) {
              setError(result.error.message);
              return;
            }
            window.location.reload();
          });
        }}
      >
        <h2 className="text-sm font-semibold">미승인 알림톡 템플릿 생성</h2>
        <input type="hidden" name="channel" value="kakao_alimtalk" />
        <label className="block space-y-1 text-sm">
          <span>이름</span>
          <input name="name" className={matchonFieldInputClass} defaultValue="미승인 테스트" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>본문</span>
          <textarea
            name="body"
            rows={3}
            className={matchonFieldInputClass}
            defaultValue="{회원명}님, MATCHON 안내입니다."
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>변수 schema JSON</span>
          <textarea
            name="variablesJson"
            rows={2}
            className={matchonFieldInputClass}
            defaultValue='{"회원명":{"required":true,"type":"string"}}'
          />
        </label>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          템플릿 생성
        </Button>
      </form>
    </div>
  );
}
