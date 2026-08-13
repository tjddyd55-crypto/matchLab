"use client";

import { useEffect, useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  getOrCreateSelfRegistrationLinkAction,
  regenerateSelfRegistrationLinkAction,
  revokeSelfRegistrationLinkAction,
  updateSelfRegistrationTermsAction,
} from "@/features/gym-member-self-registration/owner-actions";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";

type LinkVm = {
  id: string;
  status: string;
  url: string | null;
  gymName: string;
  submissionCount: number;
  pendingCount: number;
  terms: { version: number; title: string; content: string };
};

export function GymMemberSelfRegistrationLinkButton() {
  const { confirm } = useAppConfirmDialog();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<LinkVm | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [termsTitle, setTermsTitle] = useState("");
  const [termsContent, setTermsContent] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [showQrLarge, setShowQrLarge] = useState(false);

  function load() {
    setError(null);
    startTransition(async () => {
      const result = await getOrCreateSelfRegistrationLinkAction();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setData(result.data);
      setUrl(result.data.url);
      setTermsTitle(result.data.terms.title);
      setTermsContent(result.data.terms.content);
    });
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function copyUrl() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function regenerate() {
    startTransition(async () => {
      const ok = await confirm({
        title: "링크를 재발급하면 기존 QR/링크는 사용할 수 없습니다. 계속할까요?",
        variant: "danger",
      });
      if (!ok) return;
      const result = await regenerateSelfRegistrationLinkAction();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setUrl(result.data.url);
      setData((prev) =>
        prev ? { ...prev, status: result.data.status } : prev,
      );
    });
  }

  function revoke() {
    startTransition(async () => {
      const ok = await confirm({
        title: "셀프등록 링크를 사용 중지할까요?",
        variant: "danger",
      });
      if (!ok) return;
      const result = await revokeSelfRegistrationLinkAction();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setData((prev) => (prev ? { ...prev, status: "revoked" } : prev));
      setUrl(null);
    });
  }

  function saveTerms() {
    const fd = new FormData();
    fd.set("title", termsTitle);
    fd.set("content", termsContent);
    startTransition(async () => {
      const result = await updateSelfRegistrationTermsAction(fd);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              terms: {
                version: result.data.version,
                title: termsTitle,
                content: termsContent,
              },
            }
          : prev,
      );
      setShowTerms(false);
    });
  }

  const active = data?.status === "active";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11"
        onClick={() => setOpen(true)}
      >
        셀프등록 링크
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>회원 셀프등록</DialogTitle>
          <DialogDescription>
            {data?.gymName ?? "체육관"}의 회원등록 링크입니다.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {pending && !data ? (
          <p className="text-sm text-matchon-text-secondary">불러오는 중...</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">
              상태:{" "}
              <span className="font-semibold">
                {active ? "사용 중" : "사용 중지"}
              </span>
              {data ? ` · 등록요청 ${data.pendingCount}` : null}
            </p>
            {url && active ? (
              <>
                <div className="flex justify-center rounded-xl border border-matchon-border bg-white p-4">
                  <QRCodeSVG value={url} size={showQrLarge ? 240 : 148} includeMargin />
                </div>
                <p className="break-all text-xs text-matchon-text-secondary">{url}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" className="min-h-11" onClick={copyUrl}>
                    {copied ? "복사됨" : "링크 복사"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    onClick={() => setShowQrLarge((v) => !v)}
                  >
                    QR 크게 보기
                  </Button>
                  <a
                    href="/gym/members/self-registration/print"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center rounded-md border border-matchon-border px-3 text-sm"
                  >
                    인쇄
                  </a>
                </div>
              </>
            ) : (
              <p className="text-sm text-matchon-text-secondary">
                사용 중인 링크가 없습니다. 재발급하면 새 QR이 만들어집니다.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11"
                disabled={pending}
                onClick={regenerate}
              >
                링크 재발급
              </Button>
              {active ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  disabled={pending}
                  onClick={revoke}
                >
                  사용 중지
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11"
                onClick={() => setShowTerms((v) => !v)}
              >
                이용규정 관리
              </Button>
            </div>
            {showTerms ? (
              <div className="space-y-2 rounded-lg border border-matchon-border p-3">
                <input
                  className={matchonFieldInputClass}
                  value={termsTitle}
                  onChange={(e) => setTermsTitle(e.target.value)}
                  placeholder="제목"
                />
                <textarea
                  className={`${matchonFieldInputClass} h-40 py-2`}
                  value={termsContent}
                  onChange={(e) => setTermsContent(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11"
                  disabled={pending}
                  onClick={saveTerms}
                >
                  저장 (버전 증가)
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
