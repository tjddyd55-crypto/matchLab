"use client";

import { useCallback, useId, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import type { EventQrPrintGroup } from "@/components/domain/events/qr/EventQrCard";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  downloadSvgAsPng,
  triggerEventQrPrint,
} from "@/components/domain/judges/judge-qr-ui";
import { resolveJudgeRoleMatchonStatus } from "@/lib/ui/judge-ui";
import { cn } from "@/lib/utils";

export function CourtJudgeRoleUrlSection({
  role,
  title,
  description,
  url,
  printGroup,
  downloadFileName,
  qrPageHref,
  disabled = false,
  className,
}: {
  role: "score" | "head";
  title: string;
  description: string;
  url: string;
  printGroup: Extract<EventQrPrintGroup, "judge-court-score" | "judge-court-head">;
  downloadFileName: string;
  qrPageHref: string;
  disabled?: boolean;
  className?: string;
}) {
  const qrId = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const copyLabel =
    role === "score" ? "채점심판 URL을 복사했습니다." : "주심판 URL을 복사했습니다.";

  const copyUrl = useCallback(async () => {
    if (disabled || !url) return;
    setFeedback(null);
    try {
      await navigator.clipboard.writeText(url);
      setFeedback({ tone: "success", message: copyLabel });
    } catch {
      setFeedback({ tone: "error", message: "URL 복사에 실패했습니다." });
    }
  }, [copyLabel, disabled, url]);

  const downloadQr = useCallback(() => {
    if (disabled || !svgRef.current) {
      setFeedback({ tone: "error", message: "QR을 불러오지 못했습니다." });
      return;
    }
    downloadSvgAsPng(svgRef.current, downloadFileName);
    setFeedback({ tone: "success", message: "QR 이미지를 다운로드했습니다." });
  }, [disabled, downloadFileName]);

  const printQr = useCallback(() => {
    if (disabled || !url) return;
    triggerEventQrPrint(printGroup);
    setFeedback({ tone: "success", message: "인쇄 대화상자를 열었습니다." });
  }, [disabled, printGroup, url]);

  return (
    <section
      className={cn(
        "space-y-3 rounded-lg border bg-muted/20 p-3",
        disabled && "opacity-60",
        className,
      )}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{title}</p>
          <MatchonStatusBadge
            status={resolveJudgeRoleMatchonStatus(role)}
            label={role === "score" ? "채점" : "주심"}
            size="sm"
          />
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
      </div>

      {url ? (
        <code className="bg-background block break-all rounded-md border px-2 py-2 text-[11px] leading-relaxed">
          {url}
        </code>
      ) : (
        <p className="text-muted-foreground text-xs">URL이 없습니다.</p>
      )}

      {feedback ? (
        <FeedbackMessage tone={feedback.tone}>{feedback.message}</FeedbackMessage>
      ) : null}

      {showQr && url && !disabled ? (
        <div className="flex flex-col items-center gap-2 rounded-md border bg-background p-3">
          <QRCodeSVG
            id={qrId}
            ref={svgRef}
            value={url}
            size={180}
            level="M"
            includeMargin
            className="rounded-md bg-white p-1"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          size="field"
          variant="default"
          disabled={disabled || !url}
          className="w-full sm:w-auto"
          onClick={() => void copyUrl()}
        >
          URL 복사
        </Button>
        <Button
          type="button"
          size="field"
          variant="outline"
          disabled={disabled || !url}
          className="w-full sm:w-auto"
          onClick={() => setShowQr((value) => !value)}
        >
          {showQr ? "QR 닫기" : "QR 보기"}
        </Button>
        <Button
          type="button"
          size="field"
          variant="outline"
          disabled={disabled || !url}
          className="w-full sm:w-auto"
          onClick={downloadQr}
        >
          QR 다운로드
        </Button>
        <Button
          type="button"
          size="field"
          variant="secondary"
          disabled={disabled || !url}
          className="w-full sm:w-auto"
          onClick={printQr}
        >
          QR 인쇄
        </Button>
        <Link
          href={qrPageHref}
          className={cn(
            buttonVariants({ variant: "ghost", size: "field" }),
            "w-full sm:w-auto",
          )}
        >
          QR 출력 화면
        </Link>
      </div>

      {url && !disabled ? (
        <article
          data-print-group={printGroup}
          className="event-qr-card pointer-events-none absolute left-[-10000px] top-0 h-px w-px overflow-hidden opacity-0"
          aria-hidden
        >
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-sm">{description}</p>
          <QRCodeSVG value={url} size={220} level="M" includeMargin />
        </article>
      ) : null}
    </section>
  );
}
