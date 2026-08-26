"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

export function OrganizerUnmatchedPrintActions({
  eventId,
  documentTitle,
  variant = "view",
  disabled = false,
}: {
  eventId: string;
  documentTitle?: string;
  variant?: "view" | "toolbar";
  disabled?: boolean;
}) {
  const printHref = `/organizer/events/${eventId}/brackets/unmatched-print`;
  const pdfHref = `/api/organizer/events/${eventId}/brackets/unmatched-print-pdf`;
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPrint = useCallback(() => {
    if (variant === "toolbar") {
      const prev = document.title;
      if (documentTitle) document.title = documentTitle;
      window.print();
      if (documentTitle) document.title = prev;
      return;
    }
    const w = window.open(printHref, "_blank", "noopener,noreferrer");
    if (!w) window.location.href = printHref;
  }, [documentTitle, printHref, variant]);

  const onDownloadPdf = useCallback(async () => {
    if (disabled || downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(pdfHref, { credentials: "include" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error ?? "PDF를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const plainMatch = disposition.match(/filename="([^"]+)"/i);
      const filename = utf8Match?.[1]
        ? decodeURIComponent(utf8Match[1])
        : plainMatch?.[1] ?? "MATCHON_미매칭선수.pdf";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "PDF를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setDownloading(false);
    }
  }, [disabled, downloading, pdfHref]);

  if (variant === "toolbar") {
    return (
      <div className="bracket-print-toolbar-actions">
        <Button type="button" size="sm" onClick={onPrint}>
          인쇄
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={downloading || disabled}
          onClick={() => void onDownloadPdf()}
        >
          {downloading ? "생성 중…" : "PDF 다운로드"}
        </Button>
        {error ? (
          <span className="text-destructive text-xs">{error}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={downloading || disabled}
        onClick={() => void onDownloadPdf()}
      >
        {downloading ? "생성 중…" : "미매칭 선수 PDF"}
      </Button>
      {error ? (
        <span className="text-destructive w-full text-xs">{error}</span>
      ) : null}
    </div>
  );
}
