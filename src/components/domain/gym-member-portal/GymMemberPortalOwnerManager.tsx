"use client";

import { useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  createGymMemberPortalAction,
  revokeGymMemberPortalAction,
  rotateGymMemberPortalAction,
} from "@/features/gym-member-portal/owner-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatSeoulDateTime } from "@/lib/gym-attendance/seoul-date";

export type OwnerPortalLinkState = {
  id: string;
  isActive: boolean;
  createdAt: Date | string;
  lastRotatedAt: Date | string | null;
  revokedAt: Date | string | null;
  path: string | null;
  url: string | null;
  hasDisplayableLink: boolean;
  isLegacyHashOnly: boolean;
};

function resolveDisplayUrl(portal: OwnerPortalLinkState): string | null {
  if (portal.url) return portal.url;
  if (portal.path && typeof window !== "undefined") {
    return `${window.location.origin}${portal.path}`;
  }
  return null;
}

function buildNotice(gymName: string, linkUrl: string | null): string {
  const base = `[${gymName}] 회원 전용 페이지 안내

아래 링크에서 이름과 휴대폰 번호를 입력하면
그룹수업 일정, 참여 신청, 개인 PT 일정을 확인할 수 있습니다.`;
  if (!linkUrl) return base;
  return `${base}

${linkUrl}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function GymMemberPortalOwnerManager({
  gymName,
  initialPortal,
}: {
  gymName: string;
  initialPortal: OwnerPortalLinkState | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [portal, setPortal] = useState(initialPortal);
  const [confirmKind, setConfirmKind] = useState<"rotate" | "revoke" | null>(
    null,
  );

  const linkUrl = portal ? resolveDisplayUrl(portal) : null;
  const notice = buildNotice(gymName, linkUrl);

  function setPortalFromAction(data: {
    portalId: string;
    path: string;
    url: string;
    rotated?: boolean;
  }) {
    setPortal({
      id: data.portalId,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastRotatedAt: data.rotated ? new Date().toISOString() : null,
      revokedAt: null,
      path: data.path,
      url: data.url,
      hasDisplayableLink: true,
      isLegacyHashOnly: false,
    });
    setShowQr(true);
  }

  function runCreate() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await createGymMemberPortalAction();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setPortalFromAction(result.data);
      setMessage("회원 전용 페이지 링크를 만들었습니다.");
    });
  }

  function runRotate() {
    setConfirmKind(null);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await rotateGymMemberPortalAction();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setPortalFromAction({ ...result.data, rotated: true });
      setMessage("새 회원 전용 페이지 링크를 만들었습니다.");
    });
  }

  function runRevoke() {
    setConfirmKind(null);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await revokeGymMemberPortalAction();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setPortal(null);
      setShowQr(false);
      setMessage("회원 전용 페이지 사용을 중지했습니다.");
    });
  }

  async function runCopyLink() {
    setError(null);
    setMessage(null);
    if (!linkUrl) {
      setError("복사할 활성 링크가 없습니다.");
      return;
    }
    const ok = await copyToClipboard(linkUrl);
    if (!ok) {
      setError(
        "복사에 실패했습니다. 아래 주소를 직접 선택한 뒤 복사해 주세요.",
      );
      return;
    }
    setMessage("회원 전용 페이지 링크를 복사했습니다.");
  }

  async function runCopyNotice() {
    setError(null);
    setMessage(null);
    const ok = await copyToClipboard(notice);
    if (!ok) {
      setError("안내 문구 복사에 실패했습니다.");
      return;
    }
    setMessage("안내 문구를 복사했습니다.");
  }

  if (!portal) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-matchon-border bg-white p-6">
          <p className="text-sm text-matchon-text-secondary">
            회원 전용 페이지가 아직 생성되지 않았습니다.
          </p>
          <Button
            type="button"
            className="mt-4 min-h-11"
            disabled={pending}
            onClick={runCreate}
          >
            회원 전용 페이지 시작
          </Button>
        </div>
        {message ? (
          <p className="text-sm text-[#0A47FF]">{message}</p>
        ) : null}
        {error ? (
          <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-matchon-border bg-white p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold text-matchon-primary">
            회원 전용 페이지 사용 중
          </p>
          <p className="mt-2 text-sm text-matchon-text-secondary">
            이 링크는 체육관 회원이 공통으로 사용하는 주소입니다. 링크를 새로
            만들거나 사용 중지하기 전까지 계속 사용할 수 있습니다.
          </p>
          <dl className="mt-3 grid gap-2 text-sm text-matchon-text-secondary sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">생성일</dt>
              <dd>{formatSeoulDateTime(new Date(portal.createdAt))}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">마지막 재발급일</dt>
              <dd>
                {portal.lastRotatedAt
                  ? formatSeoulDateTime(new Date(portal.lastRotatedAt))
                  : "없음"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">활성 상태</dt>
              <dd>{portal.isActive ? "활성" : "중지"}</dd>
            </div>
          </dl>
        </div>

        {portal.isLegacyHashOnly || !linkUrl ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-medium">
              기존 링크는 보안 정책상 다시 표시할 수 없습니다.
            </p>
            <p className="mt-1 text-matchon-text-secondary">
              새 링크를 한 번 발급하면 이후부터는 계속 확인하고 복사할 수
              있습니다. 새 링크를 만들면 기존 링크는 즉시 사용할 수 없게
              됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">
              회원 전용 페이지 주소
            </p>
            <div className="rounded-lg border border-matchon-border bg-matchon-bg px-3 py-3">
              <p className="break-all font-mono text-xs text-matchon-text-primary sm:text-sm">
                {linkUrl}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-matchon-bg p-4 text-sm text-matchon-text-primary whitespace-pre-line">
          {notice}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={pending || !linkUrl}
            onClick={() => void runCopyLink()}
          >
            링크 복사
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={pending || !linkUrl}
            onClick={() => setShowQr((v) => !v)}
          >
            QR 코드 보기
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={pending}
            onClick={() => void runCopyNotice()}
          >
            안내 문구 복사
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={pending}
            onClick={() => setConfirmKind("rotate")}
          >
            {portal.isLegacyHashOnly
              ? "공용 링크 새로 발급"
              : "링크 새로 만들기"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11"
            disabled={pending}
            onClick={() => setConfirmKind("revoke")}
          >
            사용 중지
          </Button>
        </div>

        {linkUrl && showQr ? (
          <div className="rounded-xl border border-matchon-border bg-white p-4">
            <p className="text-sm font-medium text-matchon-text-primary">
              QR 코드
            </p>
            <p className="mt-2 break-all text-xs text-matchon-text-secondary">
              {linkUrl}
            </p>
            <div className="mt-4 flex justify-center rounded-lg bg-white p-4">
              <QRCodeSVG value={linkUrl} size={180} />
            </div>
          </div>
        ) : null}
      </div>

      {message ? (
        <p className="text-sm text-[#0A47FF]">{message}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
      ) : null}

      <Dialog
        open={confirmKind != null}
        onOpenChange={(open) => {
          if (!open) setConfirmKind(null);
        }}
        dismissible={false}
      >
        <DialogContent showCloseButton className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmKind === "rotate"
                ? "회원 전용 페이지 링크를 새로 만들까요?"
                : "회원 전용 페이지 사용을 중지할까요?"}
            </DialogTitle>
            <DialogDescription className="whitespace-pre-line text-left">
              {confirmKind === "rotate"
                ? "기존 링크는 즉시 사용할 수 없게 됩니다.\n기존 링크를 받은 회원에게 새 링크를 다시 안내해야 합니다."
                : "기존 링크로 더 이상 접속할 수 없습니다.\n다시 사용할 때 새 링크가 필요합니다."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={pending}
              onClick={() => setConfirmKind(null)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant={confirmKind === "revoke" ? "destructive" : "default"}
              className="min-h-11"
              disabled={pending}
              onClick={() => {
                if (confirmKind === "rotate") runRotate();
                else if (confirmKind === "revoke") runRevoke();
              }}
            >
              {confirmKind === "rotate" ? "새 링크 만들기" : "사용 중지"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
