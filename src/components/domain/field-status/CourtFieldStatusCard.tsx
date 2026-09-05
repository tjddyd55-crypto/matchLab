"use client";

import Link from "next/link";
import { CourtFieldStatusMatchSnippet } from "@/components/domain/field-status/CourtFieldStatusMatchSnippet";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  courtFieldStatusCardVariant,
  type CourtFieldStatusVM,
} from "@/lib/court-field-status-display";
import { eventQrSectionHref } from "@/lib/event-qr-section";
import { cn } from "@/lib/utils";

export function CourtFieldStatusCard({
  court,
  eventId,
}: {
  court: CourtFieldStatusVM;
  eventId: string;
}) {
  const { spotlight, matchCounts } = court;
  const hasMatches = court.rows.length > 0;

  return (
    <Card
      variant={courtFieldStatusCardVariant(court.overallStatus)}
      className="rounded-[14px] border-[#E2E8F0] py-0 shadow-none"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-[#E2E8F0]/80 px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <CardTitle className="text-sm font-semibold leading-snug text-[#0F172A]">
            {court.courtLabel}
          </CardTitle>
          {court.courtName.trim() !== court.courtLabel ? (
            <p className="text-xs text-[#64748B]">{court.courtName}</p>
          ) : null}
          <p className="text-[11px] text-[#64748B]">
            진행 {matchCounts.inProgress} · 대기 {matchCounts.waiting} · 종료{" "}
            {matchCounts.completed}
            {matchCounts.cancelled > 0 ? ` · 취소 ${matchCounts.cancelled}` : ""}
          </p>
        </div>
        <MatchonStatusBadge status={court.overallStatus} size="sm" />
      </CardHeader>

      <CardContent className="space-y-2.5 px-4 py-3">
        {!hasMatches ? (
          <p className="text-muted-foreground rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-xs">
            아직 배정된 경기가 없습니다.
          </p>
        ) : (
          <>
            <CourtFieldStatusMatchSnippet
              title="현재 경기"
              match={spotlight.current}
              emptyText="현재 진행중인 경기가 없습니다."
              emphasis="selected"
            />
            <CourtFieldStatusMatchSnippet
              title="다음 경기"
              match={spotlight.next}
              emptyText="다음 경기 대기 중입니다."
            />
            <CourtFieldStatusMatchSnippet
              title="최근 종료 경기"
              match={spotlight.recentFinished}
              emptyText="종료된 경기 기록이 없습니다."
              emphasis="success"
            />
          </>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href={`/organizer/events/${eventId}/operation`}
            className={cn(buttonVariants({ variant: "outline", size: "field" }), "flex-1 sm:flex-none")}
          >
            운영 화면
          </Link>
          <Link
            href={eventQrSectionHref(eventId, "onsiteOps")}
            className={cn(buttonVariants({ variant: "ghost", size: "field" }), "flex-1 sm:flex-none")}
          >
            운영관리 QR
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
