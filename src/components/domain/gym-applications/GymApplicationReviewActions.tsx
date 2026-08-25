"use client";

import { useState, useTransition } from "react";
import { rejectGymApplicationAction } from "@/features/gym-applications/actions";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";

export function GymApplicationReviewActions({
  applicationId,
  canReview,
}: {
  applicationId: string;
  canReview: boolean;
}) {
  const { confirm } = useAppConfirmDialog();
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
                const ok = await confirm({
                  title: "이 체육관의 MATCHON 이용을 승인하시겠습니까?",
                  description:
                    "승인 후 계정 초대 링크가 발급됩니다. 협회 회원사 관계는 생성되지 않습니다.",
                  confirmLabel: "승인",
                });
                if (!ok) return;

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
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                setError(null);
                const ok = await confirm({
                  title: "이 체육관 가입 신청을 반려하시겠습니까?",
                  description: "반려된 신청은 다시 승인할 수 없습니다.",
                  confirmLabel: "반려",
                  variant: "danger",
                });
                if (!ok) return;
                const fd = new FormData();
                fd.set("applicationId", applicationId);
                await rejectGymApplicationAction(fd);
              });
            }}
          >
            반려
          </Button>
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
