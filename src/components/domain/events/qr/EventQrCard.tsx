"use client";

import { useCallback, useId, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
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
  | "spectator-overview";

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
};

function downloadSvgAsPng(svg: SVGSVGElement, fileName: string) {
  const svgData = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  const canvas = document.createElement("canvas");
  const exportSize = 512;
  canvas.width = exportSize;
  canvas.height = exportSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(objectUrl);
    return;
  }
  image.onload = () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportSize, exportSize);
    ctx.drawImage(image, 0, 0, exportSize, exportSize);
    URL.revokeObjectURL(objectUrl);
    const pngUrl = canvas.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = pngUrl;
    anchor.download = fileName;
    anchor.click();
  };
  image.src = objectUrl;
}

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
}: EventQrCardProps) {
  const qrId = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [copied, setCopied] = useState(false);

  const copyUrl = useCallback(async () => {
    if (disabled || !url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [disabled, url]);

  const downloadQr = useCallback(() => {
    if (disabled || !svgRef.current) return;
    downloadSvgAsPng(
      svgRef.current,
      downloadFileName ?? `${title.replace(/\s+/g, "-")}.png`,
    );
  }, [disabled, downloadFileName, title]);

  const printCard = useCallback(() => {
    if (disabled) return;
    document.body.dataset.eventQrPrint = printGroup;
    window.print();
    window.setTimeout(() => {
      delete document.body.dataset.eventQrPrint;
    }, 500);
  }, [disabled, printGroup]);

  return (
    <article
      data-print-group={printGroup}
      className={cn(
        "event-qr-card ring-foreground/10 flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm md:p-5",
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
        {disabled ? (
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
        )}
        {!disabled && url ? (
          <code className="bg-muted max-w-full break-all rounded px-2 py-1 text-center text-[11px] leading-relaxed">
            {url}
          </code>
        ) : null}
      </div>

      <div className="no-print flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !url}
          onClick={() => void copyUrl()}
        >
          {copied ? "복사됨" : "URL 복사"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !url}
          onClick={downloadQr}
        >
          QR 다운로드
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !url}
          onClick={printCard}
        >
          인쇄
        </Button>
      </div>
    </article>
  );
}
