"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { classifyMatchonSmsMessage } from "@/lib/messaging/sms-classification";

export type BulkSmsPreviewStats = {
  requestedCount: number;
  eligibleCount: number;
  excludedCount: number;
};

type BulkSmsComposeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  targetLabel: string;
  stats: BulkSmsPreviewStats | null;
  onPreview: (message: string) => Promise<BulkSmsPreviewStats>;
  onSend: (message: string, idempotencyKey: string) => Promise<{
    successCount: number;
    failedCount: number;
    excludedCount: number;
    dryRun: boolean;
  }>;
};

export function BulkSmsComposeDialog({
  open,
  onOpenChange,
  title,
  targetLabel,
  stats: initialStats,
  onPreview,
  onSend,
}: BulkSmsComposeDialogProps) {
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<BulkSmsPreviewStats | null>(initialStats);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const idempotencyKey = useMemo(
    () => (open ? crypto.randomUUID() : ""),
    [open],
  );

  const classification = classifyMatchonSmsMessage({ body: message });

  const refreshPreview = () => {
    startTransition(async () => {
      try {
        const next = await onPreview(message);
        setStats(next);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "미리보기 실패");
      }
    });
  };

  const handleSend = () => {
    startTransition(async () => {
      try {
        const sendResult = await onSend(message, idempotencyKey);
        setConfirmOpen(false);
        setResult(
          sendResult.dryRun
            ? `테스트 모드: ${sendResult.successCount}명 처리 (실제 발송 없음)${
                sendResult.failedCount
                  ? `, 실패 ${sendResult.failedCount}명`
                  : ""
              }`
            : `${sendResult.successCount}명 성공${
                sendResult.failedCount
                  ? `, ${sendResult.failedCount}명 실패`
                  : ""
              }`,
        );
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "발송 실패");
        setConfirmOpen(false);
      }
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent layout="shell" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="rounded-md border border-matchon-border bg-matchon-surface-muted px-3 py-2 text-sm">
              <p>{targetLabel}</p>
              {stats ? (
                <ul className="mt-2 space-y-1 text-matchon-text-secondary">
                  <li>대상: {stats.requestedCount}명</li>
                  <li>문자 발송 가능: {stats.eligibleCount}명</li>
                  <li>제외(번호 없음/오류/중복): {stats.excludedCount}명</li>
                </ul>
              ) : null}
            </div>

            <div className="space-y-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="메시지를 입력하세요"
                rows={5}
              />
              <p className="text-xs text-matchon-text-secondary">
                {classification.characterLength}자 · 예상{" "}
                {classification.type === "lms" ? "LMS" : "SMS"}
                {classification.requiresSubject ? " (제목 필요)" : ""}
              </p>
            </div>

            {error ? (
              <p className="text-sm text-red-600" role="alert">{error}</p>
            ) : null}
            {result ? (
              <p className="text-sm text-emerald-700" role="status">{result}</p>
            ) : null}
          </DialogBody>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={refreshPreview}
              disabled={pending || !message.trim()}
            >
              대상 갱신
            </Button>
            <Button
              type="button"
              disabled={
                pending || !message.trim() || !classification.isValid || !stats
              }
              onClick={() => setConfirmOpen(true)}
            >
              문자 보내기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent layout="shell" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>발송 확인</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm">
              총 {stats?.eligibleCount ?? 0}명에게 문자를 발송합니다.
            </p>
          </DialogBody>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              취소
            </Button>
            <Button type="button" onClick={handleSend} disabled={pending}>
              {stats?.eligibleCount ?? 0}명에게 발송
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
