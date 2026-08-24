"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BracketPrintMode } from "@/lib/brackets/bracket-print-format";

export function OrganizerBracketPrintActions({
  eventId,
  documentTitle,
  variant = "toolbar",
  printMode = "court",
}: {
  eventId: string;
  documentTitle?: string;
  /** view: 대진표 보기 상단 / toolbar: 인쇄 전용 페이지 */
  variant?: "view" | "toolbar";
  printMode?: BracketPrintMode;
}) {
  const printHref = useMemo(() => {
    const base = `/organizer/events/${eventId}/brackets/print`;
    return printMode === "all-matches" ? `${base}?mode=all-matches` : base;
  }, [eventId, printMode]);
  const pdfHref = useMemo(() => {
    const base = `/api/organizer/events/${eventId}/brackets/print-pdf`;
    return printMode === "all-matches" ? `${base}?mode=all-matches` : base;
  }, [eventId, printMode]);
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
    if (!w) {
      window.location.href = printHref;
    }
  }, [documentTitle, printHref, variant]);

  const onDownloadPdf = useCallback(async () => {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(pdfHref, { credentials: "include" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "PDF 다운로드에 실패했습니다.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const plainMatch = disposition.match(/filename="([^"]+)"/i);
      const filename = utf8Match?.[1]
        ? decodeURIComponent(utf8Match[1])
        : plainMatch?.[1] ??
          (printMode === "all-matches"
            ? `MATCHON_전체경기편집.pdf`
            : `MATCHON_시합대진표.pdf`);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF 다운로드에 실패했습니다.");
    } finally {
      setDownloading(false);
    }
  }, [pdfHref, printMode]);

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
          disabled={downloading}
          onClick={() => void onDownloadPdf()}
        >
          {downloading ? "PDF 생성 중…" : "PDF 다운로드"}
        </Button>
        {error ? (
          <span className="text-destructive text-xs">{error}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={onPrint}>
        인쇄
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={downloading}
        onClick={() => void onDownloadPdf()}
      >
        {downloading ? "PDF 생성 중…" : "PDF 다운로드"}
      </Button>
      {error ? (
        <span className="text-destructive w-full text-xs">{error}</span>
      ) : null}
    </div>
  );
}
