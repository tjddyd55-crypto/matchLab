"use client";

import { useState, useTransition } from "react";
import { rejectGymApplicationAction } from "@/features/gym-applications/actions";
import { Button } from "@/components/ui/button";

export function GymApplicationReviewActions({
  applicationId,
  canReview,
}: {
  applicationId: string;
  canReview: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!canReview && !inviteUrl) return null;

  return (
    <div className="space-y-3">
      {canReview && !inviteUrl ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                setError(null);
                const res = await fetch(
                  `/api/admin/gym-applications/${applicationId}/approve`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                  },
                );
                const json = await res.json().catch(() => null);
                if (!res.ok || !json?.data?.inviteUrl) {
                  setError(
                    json?.error?.message ||
                      "승인 처리에 실패했습니다. 다시 시도해 주세요.",
                  );
                  return;
                }
                setInviteUrl(json.data.inviteUrl);
              });
            }}
          >
            {pending ? "승인 중…" : "승인 및 계정 초대 발급"}
          </Button>
          <form action={rejectGymApplicationAction}>
            <input type="hidden" name="applicationId" value={applicationId} />
            <Button type="submit" variant="outline" disabled={pending}>
              반려
            </Button>
          </form>
        </div>
      ) : null}

      {inviteUrl ? (
        <div className="rounded-xl border border-matchon-primary/30 bg-matchon-primary-light/40 p-4">
          <p className="text-sm font-bold text-matchon-text-primary">
            체육관 계정 초대 링크
          </p>
          <p className="mt-1 break-all text-sm text-matchon-text-secondary">
            {inviteUrl}
          </p>
          <p className="mt-2 text-xs text-matchon-text-secondary">
            이 링크는 지금만 표시됩니다. 복사해 담당자에게 전달하세요. 협회
            회원사 관계는 생성되지 않습니다.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-3"
            onClick={async () => {
              await navigator.clipboard.writeText(inviteUrl);
              setCopied(true);
            }}
          >
            {copied ? "복사됨" : "링크 복사"}
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
