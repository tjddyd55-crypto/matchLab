"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  createGymStaffAccountSetupLinkAction,
  createGymStaffPasswordResetLinkAction,
  revokeGymStaffAccountSetupLinkAction,
} from "@/features/gym-staff-account/actions";
import {
  GYM_STAFF_ACCOUNT_STATUS_LABEL,
  type GymStaffAccountStatusKind,
} from "@/lib/gym-staff-account/status";

type IssuedLink = {
  kind: "setup" | "reset";
  url: string;
  message: string;
  expiresAt: string;
};

/**
 * 선생님 로그인 계정 패널.
 * 관장은 링크만 발급·폐기하며 비밀번호는 화면에 나타나지 않는다.
 */
export function GymStaffAccountPanel({
  staffId,
  loginId,
  hasAccount,
  statusKind,
  activeSetupExpiresAt,
}: {
  staffId: string;
  loginId: string | null;
  hasAccount: boolean;
  statusKind: GymStaffAccountStatusKind;
  activeSetupExpiresAt: string | null;
}) {
  const [issued, setIssued] = useState<IssuedLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState<"url" | "message" | null>(null);
  const [localStatus, setLocalStatus] =
    useState<GymStaffAccountStatusKind>(statusKind);
  const [localSetupExpires, setLocalSetupExpires] = useState(
    activeSetupExpiresAt,
  );

  async function copyText(kind: "url" | "message", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("클립보드 복사에 실패했습니다. 직접 선택해 복사해 주세요.");
    }
  }

  async function createSetup() {
    setPending(true);
    setError(null);
    const res = await createGymStaffAccountSetupLinkAction(staffId);
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setIssued({
      kind: "setup",
      url: res.data.url,
      message: res.data.message,
      expiresAt: res.data.expiresAt,
    });
    setLocalStatus("setup_link_active");
    setLocalSetupExpires(res.data.expiresAt);
  }

  async function revokeSetup() {
    setPending(true);
    setError(null);
    const res = await revokeGymStaffAccountSetupLinkAction(staffId);
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setIssued(null);
    setLocalStatus(hasAccount ? "active" : "no_account");
    setLocalSetupExpires(null);
  }

  async function createReset() {
    setPending(true);
    setError(null);
    const res = await createGymStaffPasswordResetLinkAction(staffId);
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setIssued({
      kind: "reset",
      url: res.data.url,
      message: res.data.message,
      expiresAt: res.data.expiresAt,
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-matchon-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">선생님 로그인 계정</h3>
        <span className="rounded-md border border-matchon-border px-2 py-0.5 text-xs font-medium text-matchon-text-secondary">
          {GYM_STAFF_ACCOUNT_STATUS_LABEL[localStatus]}
        </span>
      </div>

      {hasAccount ? (
        <p className="text-xs text-matchon-text-secondary">
          연결된 아이디:{" "}
          <span className="font-mono text-matchon-text-primary">{loginId}</span>
        </p>
      ) : null}

      {localStatus === "no_account" || localStatus === "setup_link_expired" ? (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => void createSetup()}
        >
          계정 설정 링크 만들기
        </Button>
      ) : null}

      {localStatus === "setup_link_active" ? (
        <div className="space-y-2">
          {localSetupExpires ? (
            <p className="text-xs text-matchon-text-secondary">
              링크 만료: {new Date(localSetupExpires).toLocaleString("ko-KR")}
            </p>
          ) : null}
          {issued?.kind !== "setup" ? (
            <p className="text-xs text-matchon-text-secondary">
              링크는 발급 직후에만 복사할 수 있습니다. 다시 발급하면 새 링크를
              받을 수 있습니다.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => void createSetup()}
            >
              다시 발급
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => void revokeSetup()}
            >
              링크 폐기
            </Button>
          </div>
        </div>
      ) : null}

      {hasAccount || localStatus === "active" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => void createReset()}
        >
          비밀번호 재설정 링크 만들기
        </Button>
      ) : null}

      {issued ? (
        <div className="space-y-2 rounded-md border border-matchon-primary/30 bg-matchon-primary-light/40 p-3 text-sm">
          <p className="font-medium">
            {issued.kind === "setup"
              ? "계정 설정 링크 (한 번만 표시)"
              : "비밀번호 재설정 링크 (한 번만 표시)"}
          </p>
          <p className="text-xs break-all text-matchon-text-secondary">
            {issued.url}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void copyText("url", issued.url)}
            >
              {copied === "url" ? "복사됨" : "링크 복사"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void copyText("message", issued.message)}
            >
              {copied === "message" ? "복사됨" : "안내 문구 복사"}
            </Button>
          </div>
          <p className="text-[11px] text-matchon-text-secondary">
            링크 만료: {new Date(issued.expiresAt).toLocaleString("ko-KR")}
          </p>
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <p className="text-[10px] text-matchon-text-secondary">
        비밀번호는 체육관에서 확인할 수 없습니다. 선생님이 링크에서 직접
        설정합니다.
      </p>
    </div>
  );
}
