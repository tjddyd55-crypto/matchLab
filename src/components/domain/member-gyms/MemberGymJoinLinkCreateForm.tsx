"use client";

import { useActionState, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createMemberGymJoinLinkAction } from "@/features/member-gyms/actions";

const initial = null as Awaited<
  ReturnType<typeof createMemberGymJoinLinkAction>
> | null;

export function MemberGymJoinLinkCreateForm() {
  const [state, action, pending] = useActionState(
    createMemberGymJoinLinkAction,
    initial,
  );
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const copied = state?.ok === true && copiedUrl === state.data.url;

  return (
    <div className="space-y-3 rounded-md border border-matchon-border bg-white p-4">
      <h2 className="text-sm font-bold">가입 링크 생성</h2>
      <form action={action} className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs md:col-span-2">
          <span className="mb-1 block font-medium">링크 이름</span>
          <input
            name="label"
            required
            className="w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
            placeholder="예: 2026 정기 가입"
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-medium">만료일시 (선택)</span>
          <input
            name="expiresAt"
            type="datetime-local"
            className="w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-medium">최대 사용 횟수 (선택)</span>
          <input
            name="maxUses"
            type="number"
            min={1}
            className="w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-xs md:col-span-2">
          <input name="allowDuplicateApplication" type="checkbox" defaultChecked />
          중복 신청 허용
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-matchon-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "생성 중…" : "링크 생성"}
          </button>
        </div>
      </form>
      {state?.ok ? (
        <div className="rounded-md border border-matchon-border bg-matchon-surface p-3 text-sm">
          <p className="font-medium text-matchon-text-primary">
            링크가 생성되었습니다. URL을 복사하거나 QR로 공유하세요.
          </p>
          <p className="mt-2 break-all text-xs text-matchon-text-secondary">
            {state.data.url}
          </p>
          <div className="mt-3 flex flex-wrap items-start gap-4">
            <button
              type="button"
              className="rounded-md border border-matchon-border px-3 py-1.5 text-xs font-semibold"
              onClick={async () => {
                await navigator.clipboard.writeText(state.data.url);
                setCopiedUrl(state.data.url);
              }}
            >
              {copied ? "복사됨" : "URL 복사"}
            </button>
            <div className="rounded border bg-white p-2">
              <QRCodeSVG value={state.data.url} size={120} level="M" includeMargin />
            </div>
          </div>
        </div>
      ) : null}
      {state && !state.ok ? (
        <p className="text-sm text-red-600">{state.error.message}</p>
      ) : null}
    </div>
  );
}
