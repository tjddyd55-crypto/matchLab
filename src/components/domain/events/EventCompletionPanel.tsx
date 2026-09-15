"use client";

import Link from "next/link";
import { EventStatus } from "@/lib/enums";
import { ORGANIZER_EVENT_STATUS_LABELS } from "@/lib/event-organizer-status";
import { formatPublicDateTime } from "@/lib/date-display";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { resolveOrganizerEventListMatchonStatus } from "@/lib/ui/event-list-ui";
import { cn } from "@/lib/utils";
import { EventArchiveDownloadPanel } from "@/components/domain/events/EventArchiveDownloadPanel";

/**
 * 종료된 대회의 운영 페이지 shortcut — lifecycle action은 EventStatusControl SSOT.
 */
export function EventCompletionPanel({
  eventId,
  status,
  completedAt,
  hasActiveArchive,
  className,
}: {
  eventId: string;
  status: EventStatus;
  completedAt: string | null;
  hasActiveArchive: boolean;
  className?: string;
}) {
  if (status !== EventStatus.finished) return null;

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border bg-card p-4 shadow-sm md:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#0F172A]">대회 상태</p>
          <MatchonStatusBadge
            status={resolveOrganizerEventListMatchonStatus(status)}
            label={ORGANIZER_EVENT_STATUS_LABELS[status]}
          />
          {completedAt ? (
            <p className="text-muted-foreground text-xs">
              {formatPublicDateTime(completedAt)} 종료
            </p>
          ) : null}
        </div>
        {hasActiveArchive ? (
          <Link
            href={`/organizer/events/${eventId}/archive`}
            className={cn(
              "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium",
            )}
          >
            대회 기록 보기
          </Link>
        ) : null}
      </div>

      {hasActiveArchive ? (
        <EventArchiveDownloadPanel eventId={eventId} />
      ) : null}
    </div>
  );
}
