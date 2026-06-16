"use client";

import {
  OrganizerApplicationStatusBadge,
  OrganizerPaymentDisplayBadge,
} from "@/components/domain/applications/OrganizerApplicationDisplayBadge";
import { OrganizerApplicationRowActions } from "@/components/domain/applications/OrganizerApplicationRowActions";
import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import { MATCH_CATEGORY_WITH_WEIGHT_LABEL } from "@/lib/ui-labels/match-category";
import { Checkbox } from "@/components/ui/checkbox";

const LIST_GRID_CLASS =
  "grid min-w-0 gap-x-3 gap-y-2 py-3 text-sm [grid-template-columns:2rem_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.9fr)] max-xl:[grid-template-columns:2rem_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)] max-xl:[&_.col-actions]:col-span-2";

export function OrganizerApplicationsList({
  eventId,
  rows,
  selectedIds,
  onToggleSelect,
}: {
  eventId: string;
  rows: OrganizerApplicationRowVM[];
  selectedIds: Set<string>;
  onToggleSelect: (applicationId: string, checked: boolean) => void;
}) {
  return (
    <div className="hidden min-w-0 md:block 2xl:hidden">
      <div className="text-muted-foreground hidden border-b px-1 pb-2 text-xs font-medium xl:grid xl:gap-x-3 xl:[grid-template-columns:2rem_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.9fr)]">
        <span />
        <span>선수 이름</span>
        <span>체육관</span>
        <span>{MATCH_CATEGORY_WITH_WEIGHT_LABEL}</span>
        <span>입금내역</span>
        <span>상태</span>
        <span className="text-right">상태입력/처리</span>
      </div>

      <ul className="divide-border min-w-0 divide-y">
        {rows.map((row) => (
          <li key={row.applicationId} className={LIST_GRID_CLASS}>
            <div className="flex items-start pt-1">
              <Checkbox
                checked={selectedIds.has(row.applicationId)}
                onCheckedChange={(v) =>
                  onToggleSelect(row.applicationId, v === true)
                }
                aria-label={`${row.fighterName} 선택`}
              />
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <div className="relative size-8 shrink-0 overflow-hidden rounded-md bg-muted">
                {row.fighterProfileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.fighterProfileImageUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-[10px] font-semibold">
                    {row.fighterName.slice(0, 1)}
                  </span>
                )}
              </div>
              <span className="min-w-0 truncate font-medium">
                {row.fighterName}
              </span>
            </div>

            <div className="min-w-0 truncate text-sm">{row.gymName}</div>

            <div
              className="text-muted-foreground min-w-0 text-xs leading-snug"
              title={row.divisionLabel}
            >
              <span className="line-clamp-2 break-words">{row.divisionLabel}</span>
            </div>

            <div className="min-w-0">
              <OrganizerPaymentDisplayBadge paymentStatus={row.paymentStatus} />
            </div>

            <div className="min-w-0">
              <OrganizerApplicationStatusBadge
                applicationStatus={row.applicationStatus}
                cancellationSource={row.cancellationSource}
              />
            </div>

            <div className="col-actions min-w-0">
              <OrganizerApplicationRowActions eventId={eventId} row={row} compact />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
