"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function DownloadLink({
  href,
  label,
  download,
}: {
  href: string;
  label: string;
  download?: boolean;
}) {
  return (
    <a
      href={href}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8")}
      {...(download ? { download: true } : {})}
    >
      {label}
    </a>
  );
}

export function EventArchiveDownloadPanel({
  eventId,
  className,
}: {
  eventId: string;
  className?: string;
}) {
  const zipUrl = `/api/organizer/events/${eventId}/archive-zip`;

  return (
    <div className={cn("space-y-3 rounded-xl border bg-card p-4", className)}>
      <p className="text-sm font-semibold text-[#0F172A]">대회 기록 다운로드</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 rounded-lg border bg-muted/10 p-3">
          <p className="text-xs font-medium text-[#334155]">신청자</p>
          <DownloadLink
            href={`/organizer/events/${eventId}/archive?export=applicants`}
            label="Excel (기록 페이지)"
          />
        </div>
        <div className="space-y-1.5 rounded-lg border bg-muted/10 p-3">
          <p className="text-xs font-medium text-[#334155]">계체</p>
          <DownloadLink
            href={`/api/organizer/events/${eventId}/weigh-in-sheet-pdf`}
            label="PDF 다운로드"
          />
        </div>
        <div className="space-y-1.5 rounded-lg border bg-muted/10 p-3">
          <p className="text-xs font-medium text-[#334155]">대진표</p>
          <DownloadLink
            href={`/api/organizer/events/${eventId}/brackets/print-pdf?mode=all-matches`}
            label="PDF 다운로드"
          />
        </div>
        <div className="space-y-1.5 rounded-lg border bg-muted/10 p-3">
          <p className="text-xs font-medium text-[#334155]">심판 채점표</p>
          <DownloadLink
            href={`/api/organizer/events/${eventId}/judge-score-sheet-pdf`}
            label="PDF (빈 양식)"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DownloadLink href={zipUrl} label="전체 기록 ZIP" download />
        <Link
          href={`/organizer/events/${eventId}/archive`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8")}
        >
          상세 기록·인쇄
        </Link>
      </div>
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        신청자 Excel은 대회 기록 페이지에서 항목을 선택해보낼 수 있습니다.
        ZIP에는 스냅샷 JSON·신청자 Excel·manifest가 포함됩니다.
      </p>
    </div>
  );
}
