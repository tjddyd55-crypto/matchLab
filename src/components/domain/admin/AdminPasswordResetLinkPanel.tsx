"use client";

import { useState, useTransition } from "react";
import {
  issueAdminPasswordResetLinkAction,
  resolveAdminPasswordResetTargetAction,
  revokeAdminPasswordResetLinkAction,
} from "@/features/admin-password-reset/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Target = {
  userId: string;
  loginId: string;
  name: string;
  emailMasked: string | null;
  phoneMasked: string | null;
  accountType: string;
  accountLabel: string;
  representativeName: string | null;
  accountStatus: string;
  activeLink: {
    id: string;
    expiresAt: string;
    createdAt: string;
  } | null;
  lastIssuedAt: string | null;
};

type Issued = {
  resetUrl: string;
  expiresAt: string;
  linkId: string;
  loginId: string;
  accountLabel: string;
};

function formatKo(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR");
  } catch {
    return iso;
  }
}

export function AdminPasswordResetLinkPanel({
  initialLoginId = "",
  inquiryId = null,
  inquiryConnected = false,
}: {
  initialLoginId?: string;
  inquiryId?: string | null;
  inquiryConnected?: boolean;
}) {
  const [loginId, setLoginId] = useState(initialLoginId);
  const [target, setTarget] = useState<Target | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function lookup() {
    setError(null);
    setIssued(null);
    startTransition(async () => {
      const res = await resolveAdminPasswordResetTargetAction({ loginId });
      if (!res.ok) {
        setTarget(null);
        setError(res.error.message);
        return;
      }
      setTarget(res.data as Target);
    });
  }

  function issue() {
    if (!target) return;
    setError(null);
    startTransition(async () => {
      const res = await issueAdminPasswordResetLinkAction({
        loginId: target.loginId,
        inquiryId,
      });
      if (!res.ok) {
        setError(res.error.message);
        setConfirmOpen(false);
        return;
      }
      setIssued(res.data);
      setConfirmOpen(false);
      setCopied(false);
      // refresh target active link metadata without raw URL
      const refreshed = await resolveAdminPasswordResetTargetAction({
        loginId: target.loginId,
      });
      if (refreshed.ok) setTarget(refreshed.data as Target);
    });
  }

  function revoke() {
    if (!target?.activeLink) return;
    setError(null);
    startTransition(async () => {
      const res = await revokeAdminPasswordResetLinkAction({
        linkId: target.activeLink!.id,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setIssued(null);
      const refreshed = await resolveAdminPasswordResetTargetAction({
        loginId: target.loginId,
      });
      if (refreshed.ok) setTarget(refreshed.data as Target);
    });
  }

  async function copyLink() {
    if (!issued?.resetUrl) return;
    try {
      await navigator.clipboard.writeText(issued.resetUrl);
      setCopied(true);
    } catch {
      setError("클립보드 복사에 실패했습니다. 링크를 직접 선택해 복사해 주세요.");
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h3 className="text-base font-bold text-matchon-text-primary">
          비밀번호 재설정
        </h3>
        <p className="mt-1 text-matchon-text-secondary">
          사용자가 등록된 휴대폰을 사용할 수 없는 경우 일회용 재설정 링크를
          발급할 수 있습니다.
        </p>
        {inquiryConnected ? (
          <p className="mt-1 text-xs text-matchon-text-secondary">
            문의 연결: 발급·사용 이력이 문의 메모에 기록됩니다.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-[12rem] flex-1">
          <span className="mb-1 block text-xs font-semibold">로그인 아이디</span>
          <input
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="w-full rounded-md border border-matchon-border px-3 py-2"
            disabled={pending}
            autoComplete="off"
          />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !loginId.trim()}
          onClick={lookup}
        >
          계정 확인
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {target ? (
        <div className="space-y-2 rounded-md border border-matchon-border bg-matchon-surface p-3">
          <p>
            <span className="font-semibold">계정 유형</span>:{" "}
            {target.accountType === "association" ? "협회" : "체육관"}
          </p>
          <p>
            <span className="font-semibold">
              {target.accountType === "association" ? "협회명" : "체육관명"}
            </span>
            : {target.accountLabel}
          </p>
          <p>
            <span className="font-semibold">대표자명</span>:{" "}
            {target.representativeName ?? target.name}
          </p>
          <p>
            <span className="font-semibold">로그인 아이디</span>: {target.loginId}
          </p>
          <p>
            <span className="font-semibold">이메일</span>:{" "}
            {target.emailMasked ?? "-"}
          </p>
          <p>
            <span className="font-semibold">휴대폰</span>:{" "}
            {target.phoneMasked ?? "-"}
          </p>
          <p>
            <span className="font-semibold">계정 상태</span>: {target.accountStatus}
          </p>
          <p>
            <span className="font-semibold">최근 발급</span>:{" "}
            {target.lastIssuedAt ? formatKo(target.lastIssuedAt) : "-"}
          </p>
          {target.activeLink ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
              <p className="font-semibold text-amber-900">발급된 재설정 링크</p>
              <p className="text-amber-900">상태: 사용 대기</p>
              <p className="text-amber-900">
                만료: {formatKo(target.activeLink.expiresAt)}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                disabled={pending}
                onClick={revoke}
              >
                링크 취소
              </Button>
            </div>
          ) : (
            <p className="text-matchon-text-secondary">미사용 재설정 링크 없음</p>
          )}

          <Button
            type="button"
            disabled={pending}
            onClick={() => setConfirmOpen(true)}
          >
            재설정 링크 발급
          </Button>
        </div>
      ) : null}

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!pending) setConfirmOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비밀번호 재설정 링크를 발급할까요?</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {target
                ? `${target.accountLabel}의 ${target.loginId} 계정에 사용할\n일회용 비밀번호 재설정 링크를 발급합니다.\n\n기존에 발급된 미사용 링크는 즉시 취소되며,\n새 링크는 30분 동안 한 번만 사용할 수 있습니다.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
            >
              취소
            </Button>
            <Button type="button" disabled={pending} onClick={issue}>
              {pending ? "발급 중…" : "링크 발급"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(issued)}
        onOpenChange={(open) => {
          if (!open) {
            setIssued(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>재설정 링크가 발급되었습니다.</DialogTitle>
            <DialogDescription>
              유효시간: {issued ? formatKo(issued.expiresAt) : ""}까지
            </DialogDescription>
          </DialogHeader>
          {issued ? (
            <div className="space-y-3">
              <textarea
                readOnly
                value={issued.resetUrl}
                className="h-24 w-full break-all rounded-md border border-matchon-border p-2 text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <p className="text-xs text-matchon-text-secondary">
                이 링크는 한 번만 사용할 수 있습니다. 사용자가 새 비밀번호를
                설정하면 즉시 만료됩니다. 링크를 안전한 방법으로 사용자에게
                전달해 주세요.
              </p>
              {copied ? (
                <p className="text-sm font-semibold text-emerald-700" role="status">
                  링크를 복사했습니다.
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="flex-wrap gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={copyLink}>
              링크 복사
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setIssued(null);
                setConfirmOpen(true);
              }}
            >
              새 링크 다시 발급
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIssued(null);
                setCopied(false);
              }}
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
