"use client";

import { useState } from "react";
import {
  createFighterAccountSetupLinkAction,
  createFighterPasswordResetLinkAction,
  revokeFighterAccountSetupLinkAction,
} from "@/features/fighter-account/actions";
import {
  FIGHTER_ACCOUNT_STATUS_LABEL,
  type FighterAccountStatusKind,
} from "@/lib/fighter-account/token";
import { Button } from "@/components/ui/button";

type IssuedLink = {
  kind: "setup" | "reset";
  url: string;
  message: string;
  expiresAt: string;
};

export function GymFighterAccountPanel({
  fighterId,
  loginId,
  hasAccount,
  statusKind,
  activeSetupExpiresAt,
}: {
  fighterId: string;
  loginId: string | null;
  hasAccount: boolean;
  statusKind: FighterAccountStatusKind;
  activeSetupExpiresAt: string | null;
}) {
  const [issued, setIssued] = useState<IssuedLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState<"url" | "message" | null>(null);
  const [localStatus, setLocalStatus] =
    useState<FighterAccountStatusKind>(statusKind);
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
    const res = await createFighterAccountSetupLinkAction(fighterId);
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
    const res = await revokeFighterAccountSetupLinkAction(fighterId);
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
    const res = await createFighterPasswordResetLinkAction(fighterId);
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

  const statusLabel = FIGHTER_ACCOUNT_STATUS_LABEL[localStatus];

  return (
    <div className="rounded-lg border border-dashed p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">선수 로그인 계정</h3>
        <span className="text-muted-foreground rounded-md border px-2 py-0.5 text-xs font-medium">
          {statusLabel}
        </span>
      </div>

      {hasAccount ? (
        <p className="text-muted-foreground text-xs">
          연결된 아이디:{" "}
          <span className="font-mono text-foreground">{loginId}</span>
        </p>
      ) : null}

      {localStatus === "no_account" || localStatus === "setup_link_expired" ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => void createSetup()}
          >
            계정 설정 링크 만들기
          </Button>
        </div>
      ) : null}

      {localStatus === "setup_link_active" ? (
        <div className="space-y-2">
          {localSetupExpires ? (
            <p className="text-muted-foreground text-xs">
              링크 만료:{" "}
              {new Date(localSetupExpires).toLocaleString("ko-KR")}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {issued?.kind === "setup" ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void copyText("url", issued.url)}
                >
                  {copied === "url" ? "복사됨" : "링크 복사"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void copyText("message", issued.message)}
                >
                  {copied === "message" ? "복사됨" : "안내 문구 복사"}
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground text-xs">
                링크는 발급 직후에만 복사할 수 있습니다. 다시 발급하면 새 링크를
                받을 수 있습니다.
              </p>
            )}
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
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => void createReset()}
          >
            비밀번호 재설정 링크 만들기
          </Button>
        </div>
      ) : null}

      {issued ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm space-y-2">
          <p className="font-medium">
            {issued.kind === "setup"
              ? "계정 설정 링크 (한 번만 표시)"
              : "비밀번호 재설정 링크 (한 번만 표시)"}
          </p>
          <p className="text-muted-foreground text-xs break-all">{issued.url}</p>
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
          <p className="text-muted-foreground text-[11px]">
            비밀번호는 표시되지 않습니다. 링크를 선수에게 전달하세요.
          </p>
        </div>
      ) : null}

      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <p className="text-muted-foreground text-[10px]">
        비밀번호는 체육관에서 확인할 수 없습니다. 선수가 링크에서 직접
        설정합니다.
      </p>
    </div>
  );
}
