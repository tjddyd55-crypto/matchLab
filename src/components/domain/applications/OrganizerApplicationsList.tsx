"use client";

import {
  OrganizerApplicationStatusBadge,
  OrganizerPaymentDisplayBadge,
} from "@/components/domain/applications/OrganizerApplicationDisplayBadge";
import { OrganizerApplicationRowActions } from "@/components/domain/applications/OrganizerApplicationRowActions";
import { OrganizerAdditionalInfoRowActions } from "@/components/domain/applications/OrganizerAdditionalInfoRowActions";
import { AdditionalInfoStatusBadge } from "@/components/domain/applications/AdditionalInfoStatusBadge";
import { OrganizerManualEntryHint } from "@/components/domain/applications/OrganizerManualEntryHint";
import { OrganizerApplicationsEmptyState } from "@/components/domain/applications/OrganizerApplicationsEmptyState";
import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import {
  ListSequenceCell,
} from "@/components/domain/shared/CompactApplicantFilterBar";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import { DivisionGenderBadge } from "@/components/domain/shared/DivisionGenderBadge";
import { MATCH_CATEGORY_WITH_WEIGHT_LABEL } from "@/lib/ui-labels/match-category";
import { displaySequenceNumber } from "@/lib/ui/list-sequence";
import { Checkbox } from "@/components/ui/checkbox";

const LIST_GRID_CLASS =
  "grid min-w-0 gap-x-3 gap-y-2 py-3 text-sm [grid-template-columns:2rem_2.5rem_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.9fr)] max-xl:[grid-template-columns:2rem_2.5rem_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)] max-xl:[&_.col-actions]:col-span-2";

export function OrganizerApplicationsList({
  eventId,
  rows,
  selectedIds,
  onToggleSelect,
  sequenceStart = 0,
  emptyMessage = "아직 신청자가 없습니다.",
  emptyDescription,
}: {
  eventId: string;
  rows: OrganizerApplicationRowVM[];
  selectedIds: Set<string>;
  onToggleSelect: (applicationId: string, checked: boolean) => void;
  sequenceStart?: number;
  emptyMessage?: string;
  emptyDescription?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="hidden min-w-0 md:block 2xl:hidden">
        <OrganizerApplicationsEmptyState
          message={emptyMessage}
          description={emptyDescription}
        />
      </div>
    );
  }

  return (
    <div className="hidden min-w-0 md:block 2xl:hidden">
      <div className="text-muted-foreground hidden border-b px-1 pb-2 text-xs font-medium xl:grid xl:gap-x-3 xl:[grid-template-columns:2rem_2.5rem_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.9fr)]">
        <span />
        <span className="text-center">순번</span>
        <span>체육관</span>
        <span>선수 이름</span>
        <span>{MATCH_CATEGORY_WITH_WEIGHT_LABEL}</span>
        <span>입금내역</span>
        <span>상태</span>
        <span className="text-right">상태입력/처리</span>
      </div>

      <ul className="divide-border min-w-0 divide-y">
        {rows.map((row, index) => (
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

            <div className="flex items-start justify-center pt-1">
              <ListSequenceCell
                sequence={displaySequenceNumber(index, sequenceStart)}
              />
            </div>

            <div className="min-w-0 truncate text-sm">{row.gymName}</div>

            <div className="min-w-0 font-medium">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate">{row.fighterName}</span>
                <DivisionGenderBadge gender={row.division?.gender} short />
              </div>
              <OrganizerManualEntryHint
                show={row.isOrganizerManualEntry}
                entrySource={row.entrySource}
              />
            </div>

            <div className="min-w-0" title={row.divisionLabel}>
              <DivisionCompactDisplay
                division={row.division}
                fallbackLabel={row.divisionLabel}
                mainClassName="text-xs"
                secondaryClassName="text-[11px]"
              />
            </div>

            <div className="min-w-0">
              <OrganizerPaymentDisplayBadge paymentStatus={row.paymentStatus} />
            </div>

            <div className="min-w-0 space-y-1">
              <OrganizerApplicationStatusBadge
                applicationStatus={row.applicationStatus}
                cancellationSource={row.cancellationSource}
              />
              <AdditionalInfoStatusBadge
                label={row.additionalInfoLabel}
                tone={row.additionalInfoBadgeTone}
              />
            </div>

            <div className="col-actions min-w-0 space-y-1">
              <OrganizerAdditionalInfoRowActions
                eventId={eventId}
                row={row}
                compact
              />
              <OrganizerApplicationRowActions eventId={eventId} row={row} compact />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
