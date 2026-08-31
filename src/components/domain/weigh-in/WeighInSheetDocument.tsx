"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import type { WeighInSheetDocument } from "@/lib/weigh-in/weigh-in-sheet";
import { cn } from "@/lib/utils";

export function WeighInSheetToolbar({
  eventId,
  documentTitle,
}: {
  eventId: string;
  documentTitle: string;
}) {
  const pdfHref = `/api/organizer/events/${eventId}/weigh-in-sheet-pdf`;
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPrint = useCallback(() => {
    const prev = document.title;
    document.title = documentTitle;
    window.print();
    document.title = prev;
  }, [documentTitle]);

  const onDownloadPdf = useCallback(async () => {
    if (downloading) return;
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
  }, [downloading, pdfHref]);

  return (
    <div className="weigh-in-sheet-toolbar no-print">
      <Link
        href={`/organizer/events/${eventId}/check-in`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        ← 계체 관리
      </Link>
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
        {downloading ? "생성 중…" : "PDF 다운로드"}
      </Button>
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </div>
  );
}

export function WeighInSheetDocumentView({
  doc,
}: {
  doc: WeighInSheetDocument;
}) {
  return (
    <div className="weigh-in-sheet-document">
      <header className="weigh-in-sheet-header">
        <p className="weigh-in-sheet-event-title">{doc.eventTitle}</p>
        <h1 className="weigh-in-sheet-doc-title">계체 기록지</h1>
        <p className="weigh-in-sheet-meta">
          대회일: {doc.eventDateLabel} · 출력일: {doc.printedAtLabel}
        </p>
      </header>

      {doc.groups.length === 0 ? (
        <p className="weigh-in-sheet-empty">승인된 신청자가 없습니다.</p>
      ) : (
        doc.groups.map((group) => (
          <section key={group.gymKey} className="weigh-in-sheet-group">
            <h2 className="weigh-in-sheet-group-title">{group.gymName}</h2>
            <table className="weigh-in-sheet-table">
              <thead>
                <tr>
                  <th className="weigh-in-sheet-col-name">이름</th>
                  <th className="weigh-in-sheet-col-gender">성별</th>
                  <th className="weigh-in-sheet-col-birth">생년월일</th>
                  <th className="weigh-in-sheet-col-division">경기구분</th>
                  <th className="weigh-in-sheet-col-weight-class">체급</th>
                  <th className="weigh-in-sheet-col-app-weight">신청체중</th>
                  <th className="weigh-in-sheet-col-actual">실제 계체</th>
                </tr>
              </thead>
              <tbody>
                {group.athletes.map((row) => (
                  <tr key={row.applicationId}>
                    <td className="weigh-in-sheet-col-name">{row.fighterName}</td>
                    <td className="weigh-in-sheet-col-gender">
                      {row.genderLabel}
                    </td>
                    <td className="weigh-in-sheet-col-birth">
                      {row.birthDateLabel}
                    </td>
                    <td className="weigh-in-sheet-col-division">
                      {row.divisionCategoryLabel}
                    </td>
                    <td className="weigh-in-sheet-col-weight-class">
                      {row.weightClassLabel}
                    </td>
                    <td className="weigh-in-sheet-col-app-weight">
                      {row.applicationWeightLabel}
                    </td>
                    <td className="weigh-in-sheet-col-actual">__________ kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}
    </div>
  );
}
