"use client";

import { useCallback, useId, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/card";
import {
  downloadSvgAsPng,
  triggerEventQrPrint,
} from "@/components/domain/judges/judge-qr-ui";
import { cn } from "@/lib/utils";

export type EventQrPrintGroup =
  | "judge-common"
  | "judge-individual"
  | "judge-court-score"
  | "judge-court-head"
  | "spectator-all"
  | "spectator-brackets"
  | "spectator-results"
  | "spectator-live"
  | "spectator-overview"
  | "onsite-ops";

type EventQrCardProps = {
  title: string;
  description: string;
  steps?: string;
  url: string;
  disabled?: boolean;
  disabledReason?: string;
  printGroup: EventQrPrintGroup;
  qrSize?: number;
  subtitle?: string;
  badge?: string;
  meta?: string;
  downloadFileName?: string;
  className?: string;
  layout?: "stack" | "split";
  urlLabel?: string;
};

export function EventQrCard({
  title,
  description,
  steps,
  url,
  disabled = false,
  disabledReason,
  printGroup,
  qrSize = 220,
  subtitle,
  badge,
  meta,
  downloadFileName,
  className,
  layout = "stack",
  urlLabel,
}: EventQrCardProps) {
  const qrId = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const copyUrl = useCallback(async () => {
    if (disabled || !url) return;
    setFeedback(null);
    try {
      await navigator.clipboard.writeText(url);
      setFeedback({ tone: "success", message: "URL을 복사했습니다." });
    } catch {
      setFeedback({ tone: "error", message: "URL 복사에 실패했습니다." });
    }
  }, [disabled, url]);

  const downloadQr = useCallback(() => {
    if (disabled || !svgRef.current) {
      setFeedback({ tone: "error", message: "QR을 불러오지 못했습니다." });
      return;
    }
    downloadSvgAsPng(
      svgRef.current,
      downloadFileName ?? `${title.replace(/\s+/g, "-")}.png`,
    );
    setFeedback({ tone: "success", message: "QR 이미지를 다운로드했습니다." });
  }, [disabled, downloadFileName, title]);

  const printCard = useCallback(() => {
    if (disabled) return;
    triggerEventQrPrint(printGroup);
    setFeedback({ tone: "success", message: "인쇄 대화상자를 열었습니다." });
  }, [disabled, printGroup]);

  const headerBlock = (
    <header className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {badge ? (
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
            {badge}
          </span>
        ) : null}
      </div>
      {subtitle ? (
        <p className="text-muted-foreground text-xs">{subtitle}</p>
      ) : null}
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
      {steps ? (
        <p className="text-muted-foreground text-xs">
          <span className="font-medium">절차:</span> {steps}
        </p>
      ) : null}
      {meta ? <p className="text-muted-foreground text-xs">{meta}</p> : null}
      {disabled && disabledReason ? (
        <p className="text-amber-700 text-xs dark:text-amber-400">
          {disabledReason}
        </p>
      ) : null}
    </header>
  );

  const qrBlock = disabled ? (
    <div
      className="bg-muted text-muted-foreground flex items-center justify-center rounded-lg border border-dashed text-xs"
      style={{ width: qrSize, height: qrSize }}
    >
      QR 비활성
    </div>
  ) : (
    <QRCodeSVG
      id={qrId}
      ref={svgRef}
      value={url}
      size={qrSize}
      level="M"
      includeMargin
      className="event-qr-image rounded-md bg-white p-1"
    />
  );

  const urlBlock =
    !disabled && url ? (
      <div className="space-y-1">
        {urlLabel ? (
          <p className="text-muted-foreground text-[11px] font-semibold">
            {urlLabel}
          </p>
        ) : null}
        <code className="bg-muted block max-w-full break-all rounded px-2 py-1.5 text-[11px] leading-relaxed">
          {url}
        </code>
      </div>
    ) : null;

  const actionBlock = (
    <div className="no-print flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Button
        type="button"
        variant="default"
        size="default"
        disabled={disabled || !url}
        className="w-full sm:w-auto"
        onClick={() => void copyUrl()}
      >
        링크 복사
      </Button>
      <Button
        type="button"
        variant="outline"
        size="default"
        disabled={disabled || !url}
        className="w-full sm:w-auto"
        onClick={downloadQr}
      >
        QR 다운로드
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="default"
        disabled={disabled || !url}
        className="w-full sm:w-auto"
        onClick={printCard}
      >
        QR 인쇄
      </Button>
    </div>
  );

  if (layout === "split") {
    return (
      <article
        data-print-group={printGroup}
        className={cn(
          cardVariants({ variant: disabled ? "muted" : "interactive" }),
          "event-qr-card p-4 md:p-5",
          disabled && "opacity-60",
          className,
        )}
      >
        <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
          <div className="flex flex-col items-center gap-2 md:items-start">
            {qrBlock}
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            {headerBlock}
            {urlBlock}
            {feedback ? (
              <FeedbackMessage tone={feedback.tone}>
                {feedback.message}
              </FeedbackMessage>
            ) : null}
            {actionBlock}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      data-print-group={printGroup}
      className={cn(
        cardVariants({ variant: disabled ? "muted" : "interactive" }),
        "event-qr-card flex flex-col gap-4 p-4 md:p-5",
        disabled && "opacity-60",
        className,
      )}
    >
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">{title}</h3>
          {badge ? (
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
              {badge}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p className="text-muted-foreground text-xs">{subtitle}</p>
        ) : null}
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
        {steps ? (
          <p className="text-muted-foreground text-xs">
            <span className="font-medium">절차:</span> {steps}
          </p>
        ) : null}
        {meta ? (
          <p className="text-muted-foreground text-xs">{meta}</p>
        ) : null}
        {disabled && disabledReason ? (
          <p className="text-amber-700 text-xs dark:text-amber-400">
            {disabledReason}
          </p>
        ) : null}
      </header>

      <div className="flex flex-col items-center gap-3">
        {qrBlock}
        {urlBlock ? (
          <code className="bg-muted max-w-full break-all rounded px-2 py-1 text-center text-[11px] leading-relaxed">
            {url}
          </code>
        ) : null}
      </div>

      {feedback ? (
        <FeedbackMessage tone={feedback.tone}>{feedback.message}</FeedbackMessage>
      ) : null}

      {actionBlock}
    </article>
  );
}
