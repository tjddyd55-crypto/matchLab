"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BracketPrintMode } from "@/lib/brackets/bracket-print-format";

export function OrganizerBracketPrintActions({
  eventId,
  variant = "toolbar",
  printMode = "court",
}: {
  eventId: string;
  /** @deprecated 인쇄 버튼 제거 후 미사용 — PDF 생성용 print route title과 무관 */
  documentTitle?: string;
  /** view: 대진표 보기 상단 / toolbar: 인쇄 전용 페이지 */
  variant?: "view" | "toolbar";
  printMode?: BracketPrintMode;
}) {
  const pdfHref = useMemo(() => {
    const base = `/api/organizer/events/${eventId}/brackets/print-pdf`;
    return printMode === "all-matches" ? `${base}?mode=all-matches` : base;
  }, [eventId, printMode]);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDownloadPdf = useCallback(async () => {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(pdfHref, { credentials: "include" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error ??
            "PDF를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const plainMatch = disposition.match(/filename="([^"]+)"/i);
      const filename = utf8Match?.[1]
        ? decodeURIComponent(utf8Match[1])
        : plainMatch?.[1] ?? `MATCHON_대진표.pdf`;

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
  }, [pdfHref]);

  const wrapperClass =
    variant === "toolbar"
      ? "bracket-print-toolbar-actions"
      : "flex flex-wrap items-center gap-2";

  return (
    <div className={wrapperClass}>
      <Button
        type="button"
        size="sm"
        variant={variant === "toolbar" ? "default" : "outline"}
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
