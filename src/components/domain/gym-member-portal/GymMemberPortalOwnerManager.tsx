"use client";

import { useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  createGymMemberPortalAction,
  revokeGymMemberPortalAction,
  rotateGymMemberPortalAction,
} from "@/features/gym-member-portal/owner-actions";
import { Button } from "@/components/ui/button";
import { formatSeoulDateTime } from "@/lib/gym-attendance/seoul-date";

type PortalState = {
  id: string;
  isActive: boolean;
  createdAt: Date | string;
  lastRotatedAt: Date | string | null;
  revokedAt: Date | string | null;
};

function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function GymMemberPortalOwnerManager({
  gymName,
  initialPortal,
}: {
  gymName: string;
  initialPortal: PortalState | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [freshLink, setFreshLink] = useState<{
    path: string;
    rawToken: string;
  } | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [portal, setPortal] = useState(initialPortal);

  const notice = `${gymName} 회원 전용 페이지입니다.
아래 링크에서 이름과 휴대폰 번호를 입력하면
그룹수업 일정과 개인 PT 일정을 확인할 수 있습니다.`;

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("복사에 실패했습니다.");
    }
  }

  function runCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createGymMemberPortalAction();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setFreshLink({ path: result.data.path, rawToken: result.data.rawToken });
      setShowQr(true);
      setPortal({
        id: result.data.portalId,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastRotatedAt: null,
        revokedAt: null,
      });
    });
  }

  function runRotate() {
    if (
      !window.confirm(
        "링크를 다시 만들면 기존 회원 전용 링크는 사용할 수 없습니다. 계속할까요?",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rotateGymMemberPortalAction();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setFreshLink({ path: result.data.path, rawToken: result.data.rawToken });
      setShowQr(true);
      setPortal({
        id: result.data.portalId,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastRotatedAt: new Date().toISOString(),
        revokedAt: null,
      });
    });
  }

  function runRevoke() {
    if (
      !window.confirm(
        "회원 전용 페이지 사용을 중지할까요? 기존 링크와 회원 세션이 모두 차단됩니다.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await revokeGymMemberPortalAction();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setPortal(null);
      setFreshLink(null);
      setShowQr(false);
    });
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
            회원 전용 링크 만들기
          </Button>
        </div>
        {error ? (
          <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
        ) : null}
      </div>
    );
  }

  const linkPath = freshLink?.path ?? null;
  const linkUrl = linkPath ? absoluteUrl(linkPath) : null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-matchon-border bg-white p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold text-matchon-primary">
            회원 전용 페이지 사용 중
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

        <div className="rounded-lg bg-matchon-bg p-4 text-sm text-matchon-text-primary whitespace-pre-line">
          {notice}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={pending || !linkUrl}
            onClick={() => linkUrl && void copyText(linkUrl)}
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
            onClick={() => void copyText(notice)}
          >
            안내 문구 복사
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={pending}
            onClick={runRotate}
          >
            링크 다시 만들기
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11"
            disabled={pending}
            onClick={runRevoke}
          >
            사용 중지
          </Button>
        </div>

        {!linkUrl ? (
          <p className="text-xs text-matchon-text-secondary">
            보안상 기존 링크의 평문 토큰은 다시 표시되지 않습니다. 링크를
            다시 만들면 새 주소를 복사할 수 있습니다.
          </p>
        ) : null}

        {freshLink && showQr && linkUrl ? (
          <div className="rounded-xl border border-matchon-border bg-white p-4">
            <p className="text-sm font-medium text-matchon-text-primary">
              새 링크 (이 화면에서만 확인)
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

      {error ? (
        <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
      ) : null}
    </div>
  );
}
