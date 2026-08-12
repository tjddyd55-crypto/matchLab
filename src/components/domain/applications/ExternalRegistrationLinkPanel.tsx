"use client";

import { useState, useTransition } from "react";
import {
  ensureExternalRegistrationLinkAction,
  regenerateExternalRegistrationLinkAction,
  revokeExternalRegistrationLinkAction,
} from "@/features/external-registration/actions";
import type { ExternalRegistrationLinkVM } from "@/lib/services/external-registration-link.service";
import { Button } from "@/components/ui/button";
import { formatPublicDateTime } from "@/lib/date-display";
import { cn } from "@/lib/utils";

export function ExternalRegistrationLinkTrigger({
  eventId,
  link,
  open,
  onOpenChange,
  onLinkChange,
  className,
}: {
  eventId: string;
  link: ExternalRegistrationLinkVM | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinkChange: (link: ExternalRegistrationLinkVM) => void;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (link && open) {
      onOpenChange(false);
      return;
    }
    if (link) {
      onOpenChange(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await ensureExternalRegistrationLinkAction(eventId);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      onLinkChange(res.data);
      onOpenChange(true);
    });
  }

  return (
    <div className={cn("flex flex-col items-stretch gap-1 sm:items-end", className)}>
      <Button
        type="button"
        size="sm"
        className="h-9"
        variant={open ? "secondary" : "outline"}
        disabled={pending}
        onClick={handleClick}
      >
        {link ? (open ? "링크 닫기" : "링크 관리") : "링크 생성"}
      </Button>
      {error ? (
        <p className="text-destructive max-w-[12rem] text-[11px]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ExternalRegistrationLinkPanel({
  eventId,
  link,
  open,
  onOpenChange,
  onLinkChange,
}: {
  eventId: string;
  link: ExternalRegistrationLinkVM | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinkChange: (link: ExternalRegistrationLinkVM) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<
      | { ok: true; data: ExternalRegistrationLinkVM }
      | { ok: false; error: { message: string } }
    >,
  ) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      onLinkChange(res.data);
      onOpenChange(true);
    });
  }

  async function copyUrl() {
    if (!link?.url) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("링크 복사에 실패했습니다.");
    }
  }

  if (!open || !link) return null;

  return (
    <div className="space-y-2 rounded-lg border bg-background p-3 text-sm">
      <div className="grid gap-1 text-xs sm:grid-cols-2">
        <p>
          상태{" "}
          <span
            className={cn(
              "font-medium",
              link.status === "active" ? "text-emerald-700" : "text-destructive",
            )}
          >
            {link.status === "active" ? "사용중" : "사용 중지"}
          </span>
        </p>
        <p>
          신청마감{" "}
          <span className="font-medium">
            {formatPublicDateTime(link.registrationEndDate)}
          </span>
        </p>
        <p>
          등록건수 <span className="font-medium">{link.athleteCount}명</span>
          <span className="text-muted-foreground">
            {" "}
            · 제출 {link.submissionCount}회
          </span>
        </p>
      </div>
      <p className="break-all rounded border bg-muted/30 px-2 py-1.5 font-mono text-[11px] leading-relaxed">
        {link.url}
      </p>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={copyUrl} disabled={pending}>
          {copied ? "복사됨" : "링크 복사"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || link.status !== "active"}
          onClick={() => run(() => revokeExternalRegistrationLinkAction(eventId))}
        >
          사용 중지
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(() => regenerateExternalRegistrationLinkAction(eventId))
          }
        >
          재발급
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onOpenChange(false)}
        >
          닫기
        </Button>
      </div>
    </div>
  );
}
