"use client";

import {
  OrganizerApplicationStatusBadge,
  OrganizerPaymentDisplayBadge,
} from "@/components/domain/applications/OrganizerApplicationDisplayBadge";
import { OrganizerApplicationRowActions } from "@/components/domain/applications/OrganizerApplicationRowActions";
import { OrganizerManualEntryHint } from "@/components/domain/applications/OrganizerManualEntryHint";
import { OrganizerApplicationsEmptyState } from "@/components/domain/applications/OrganizerApplicationsEmptyState";
import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import { formatPublicDateTime } from "@/lib/date-display";
import { ListSequenceMobilePrefix } from "@/components/domain/shared/CompactApplicantFilterBar";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import { DivisionGenderBadge } from "@/components/domain/shared/DivisionGenderBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { displaySequenceNumber } from "@/lib/ui/list-sequence";
import { matchonMobileCardListClass } from "@/lib/ui/matchon-shell-ui";

export function OrganizerApplicationsCards({
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
      <div className="md:hidden">
        <OrganizerApplicationsEmptyState
          message={emptyMessage}
          description={emptyDescription}
        />
      </div>
    );
  }

  return (
    <div className={matchonMobileCardListClass}>
      {rows.map((row, index) => (
        <Card key={row.applicationId} className="rounded-xl border-matchon-border bg-white py-4 shadow-sm">
          <CardHeader className="space-y-2 px-4 py-0">
            <div className="flex items-start gap-2">
              <Checkbox
                checked={selectedIds.has(row.applicationId)}
                onCheckedChange={(v) =>
                  onToggleSelect(row.applicationId, v === true)
                }
                aria-label={`${row.fighterName} 선택`}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <ListSequenceMobilePrefix
                    sequence={displaySequenceNumber(index, sequenceStart)}
                  />
                  <p className="text-muted-foreground truncate text-xs font-medium">
                    {row.gymName}
                  </p>
                </div>
                <div className="flex min-w-0 items-center gap-1.5">
                  <CardTitle className="truncate text-base leading-snug">
                    {row.fighterName}
                  </CardTitle>
                  <DivisionGenderBadge gender={row.division.gender} short />
                </div>
                <OrganizerManualEntryHint
                  show={row.isOrganizerManualEntry}
                  entrySource={row.entrySource}
                />
              </div>
            </div>            <div className="flex flex-wrap gap-1.5 pl-8">
              <OrganizerPaymentDisplayBadge paymentStatus={row.paymentStatus} />
              <OrganizerApplicationStatusBadge
                applicationStatus={row.applicationStatus}
                cancellationSource={row.cancellationSource}
              />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-4 pt-2 text-sm">
            <div title={row.divisionLabel}>
              <DivisionCompactDisplay
                division={row.division}
                mainClassName="text-xs"
                secondaryClassName="text-[11px]"
              />
            </div>
            {row.depositorName ? (
              <p className="text-muted-foreground text-xs">
                입금자명 {row.depositorName}
              </p>
            ) : null}
            {row.appliedAt ? (
              <p className="text-muted-foreground text-xs">
                신청일 {formatPublicDateTime(row.appliedAt)}
              </p>
            ) : null}
            <OrganizerApplicationRowActions
              eventId={eventId}
              row={row}
              touchFriendly
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
