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
  const [approved, setApproved] = useState(false);
  const [loginReady, setLoginReady] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!canReview && !approved) return null;

  return (
    <div className="space-y-3">
      {canReview && !approved ? (
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
                    "승인 즉시 해당 체육관 계정을 사용할 수 있습니다. 협회 회원사 관계는 생성되지 않습니다.",
                  confirmLabel: "체육관 승인",
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
                if (!res.ok || !json?.data?.gymId) {
                  setError(
                    json?.error?.message ||
                      "승인 처리에 실패했습니다. 다시 시도해 주세요.",
                  );
                  return;
                }
                setApproved(true);
                setLoginReady(Boolean(json.data.loginReady));
                setInviteUrl(
                  typeof json.data.inviteUrl === "string"
                    ? json.data.inviteUrl
                    : null,
                );
              });
            }}
          >
            {pending ? "승인 중…" : "체육관 승인"}
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

      {approved && loginReady ? (
        <div className="rounded-xl border border-matchon-primary/30 bg-matchon-primary-light/40 p-4">
          <p className="text-sm font-bold text-matchon-text-primary">
            승인 완료
          </p>
          <p className="mt-1 text-sm text-matchon-text-secondary">
            신청자가 가입 시 설정한 아이디·비밀번호로 바로 로그인할 수 있습니다.
            별도 초대 링크는 필요하지 않습니다. 협회 회원사 관계는 생성되지
            않습니다.
          </p>
        </div>
      ) : null}

      {approved && inviteUrl ? (
        <div className="rounded-xl border border-matchon-primary/30 bg-matchon-primary-light/40 p-4">
          <p className="text-sm font-bold text-matchon-text-primary">
            레거시 신청 — 계정 초대 링크
          </p>
          <p className="mt-1 break-all text-sm text-matchon-text-secondary">
            {inviteUrl}
          </p>
          <p className="mt-2 text-xs text-matchon-text-secondary">
            이 신청은 가입 시 비밀번호가 없어 초대 링크가 필요합니다. 링크는
            지금만 표시됩니다.
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
