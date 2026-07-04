"use client";

import {
  OrganizerApplicationStatusBadge,
  OrganizerPaymentDisplayBadge,
} from "@/components/domain/applications/OrganizerApplicationDisplayBadge";
import { OrganizerApplicationRowActions } from "@/components/domain/applications/OrganizerApplicationRowActions";
import { OrganizerManualEntryHint } from "@/components/domain/applications/OrganizerManualEntryHint";
import type { OrganizerApplicationRowVM } from "@/components/domain/applications/OrganizerApplicationsTable";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import { DivisionGenderBadge } from "@/components/domain/shared/DivisionGenderBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OrganizerApplicationsCards({
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
    <div className="flex min-w-0 flex-col gap-3 md:hidden">
      {rows.map((row) => (
        <Card key={row.applicationId}>
          <CardHeader className="pb-2">
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
                <div className="text-muted-foreground text-xs">{row.gymName}</div>
                <div className="flex min-w-0 items-center gap-1.5">
                  <CardTitle className="text-base">{row.fighterName}</CardTitle>
                  <DivisionGenderBadge gender={row.division.gender} short />
                </div>
                <OrganizerManualEntryHint show={row.isOrganizerManualEntry} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <DivisionCompactDisplay
              division={row.division}
              mainClassName="text-xs"
              secondaryClassName="text-[11px]"
            />
            <div className="flex flex-wrap gap-2">
              <OrganizerPaymentDisplayBadge paymentStatus={row.paymentStatus} />
              <OrganizerApplicationStatusBadge
                applicationStatus={row.applicationStatus}
                cancellationSource={row.cancellationSource}
              />
            </div>
            {row.depositorName ? (
              <div className="text-muted-foreground text-xs">
                입금자명 {row.depositorName}
              </div>
            ) : null}
            <OrganizerApplicationRowActions eventId={eventId} row={row} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
