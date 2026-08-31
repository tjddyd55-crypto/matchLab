"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

export function OrganizerWeighInSheetActions({
  eventId,
  disabled = false,
}: {
  eventId: string;
  disabled?: boolean;
}) {
  const pdfHref = `/api/organizer/events/${eventId}/weigh-in-sheet-pdf`;
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        : plainMatch?.[1] ?? "MATCHON_계체기록지.pdf";

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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || downloading}
        onClick={() => void onDownloadPdf()}
      >
        {downloading ? "PDF 생성 중…" : "계체 기록지 PDF"}
      </Button>
      {error ? (
        <span className="text-destructive w-full text-xs">{error}</span>
      ) : null}
    </div>
  );
}
