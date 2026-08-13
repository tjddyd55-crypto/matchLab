"use client";

import type {
  ApplicationCancellationSource,
  ApplicationStatus,
  PaymentStatus,
} from "@/generated/prisma";
import type {
  ApplicationFormMode,
  CustomFormSnapshot,
} from "@/lib/application-form/custom-form";
import {
  OrganizerApplicationStatusBadge,
  OrganizerPaymentDisplayBadge,
} from "@/components/domain/applications/OrganizerApplicationDisplayBadge";
import { OrganizerApplicationRowActions } from "@/components/domain/applications/OrganizerApplicationRowActions";
import { OrganizerManualEntryHint } from "@/components/domain/applications/OrganizerManualEntryHint";
import { OrganizerApplicationsEmptyState } from "@/components/domain/applications/OrganizerApplicationsEmptyState";
import {
  ListSequenceCell,
} from "@/components/domain/shared/CompactApplicantFilterBar";
import { DivisionCompactDisplay } from "@/components/domain/shared/DivisionCompactDisplay";
import { DivisionGenderBadge } from "@/components/domain/shared/DivisionGenderBadge";
import type { EventDivisionDisplayInput } from "@/lib/event-division-fields";
import { MATCH_CATEGORY_WITH_WEIGHT_LABEL } from "@/lib/ui-labels/match-category";
import { cn } from "@/lib/utils";
import {
  listTableHeaderCellCenterClass,
  listTableHeaderCellStartClass,
  listTableHeaderRowClass,
} from "@/lib/ui/list-table-styles";
import { displaySequenceNumber } from "@/lib/ui/list-sequence";
import { matchonCompactTableWrapClass } from "@/lib/ui/matchon-shell-ui";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type OrganizerApplicationRowVM = {
  applicationId: string;
  fighterId: string;
  fighterProfileImageUrl: string | null;
  fighterName: string;
  gymId: string;
  gymName: string;
  divisionId: string;
  divisionLabel: string;
  division: EventDivisionDisplayInput;
  applicationStatus: ApplicationStatus;
  cancellationSource: ApplicationCancellationSource | null;
  paymentStatus: PaymentStatus;
  paymentId: string | null;
  depositorName: string | null;
  memo: string | null;
  appliedAt: string | null;
  createdAt: string;
  guardianConsentRequired: boolean;
  consentSummaryLabel: string;
  consentFilterKey: string;
  customFormSnapshot: CustomFormSnapshot | null;
  applicationFormMode: ApplicationFormMode;
  isOrganizerManualEntry: boolean;
  entrySource?: "organizer_manual" | "external_link" | null;
  recordText?: string | null;
  careerText?: string | null;
  insuranceRrnMasked?: string | null;
  insuranceConsentAgreed?: boolean;
  insuranceConsentLabel?: string;
};

export function OrganizerApplicationsTable({
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
      <div className="hidden min-w-0 2xl:block">
        <OrganizerApplicationsEmptyState
          message={emptyMessage}
          description={emptyDescription}
        />
      </div>
    );
  }

  return (
    <div className={cn(matchonCompactTableWrapClass, "hidden min-w-0 2xl:block")}>
      <Table className="w-full table-fixed">
        <TableHeader className={listTableHeaderRowClass}>
          <TableRow className="border-b hover:bg-transparent">
            <TableHead className={cn(listTableHeaderCellCenterClass, "w-[3%]")} />
            <TableHead className={cn(listTableHeaderCellCenterClass, "w-[5%]")}>
              순번
            </TableHead>
            <TableHead className={cn(listTableHeaderCellStartClass, "w-[10%]")}>
              체육관
            </TableHead>
            <TableHead className={cn(listTableHeaderCellStartClass, "w-[12%]")}>
              선수명
            </TableHead>
            <TableHead className={cn(listTableHeaderCellStartClass, "w-[18%]")}>
              {MATCH_CATEGORY_WITH_WEIGHT_LABEL}
            </TableHead>
            <TableHead className={cn(listTableHeaderCellCenterClass, "w-[10%]")}>
              입금내역
            </TableHead>
            <TableHead className={cn(listTableHeaderCellCenterClass, "w-[10%]")}>
              상태
            </TableHead>
            <TableHead className={cn(listTableHeaderCellCenterClass, "w-[22%]")}>
              상태입력/처리
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.applicationId} className="border-b border-matchon-border/60 hover:bg-matchon-surface/50">
              <TableCell className="align-middle">
                <Checkbox
                  checked={selectedIds.has(row.applicationId)}
                  onCheckedChange={(v) =>
                    onToggleSelect(row.applicationId, v === true)
                  }
                  aria-label={`${row.fighterName} 선택`}
                />
              </TableCell>
              <TableCell className="align-middle text-center">
                <ListSequenceCell
                  sequence={displaySequenceNumber(index, sequenceStart)}
                />
              </TableCell>
              <TableCell className="align-middle">
                <div className="truncate text-sm">{row.gymName}</div>
              </TableCell>
              <TableCell className="align-middle">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-medium">
                    {row.fighterName}
                  </span>
                  <DivisionGenderBadge gender={row.division.gender} short />
                </div>
                <OrganizerManualEntryHint
                  show={row.isOrganizerManualEntry}
                  entrySource={row.entrySource}
                />
              </TableCell>
              <TableCell className="align-top">
                <DivisionCompactDisplay
                  division={row.division}
                  mainClassName="text-xs"
                  secondaryClassName="text-[11px]"
                />
              </TableCell>
              <TableCell className="align-top text-center">
                <OrganizerPaymentDisplayBadge paymentStatus={row.paymentStatus} />
                {row.depositorName ? (
                  <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
                    {row.depositorName}
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="align-top text-center">
                <OrganizerApplicationStatusBadge
                  applicationStatus={row.applicationStatus}
                  cancellationSource={row.cancellationSource}
                />
              </TableCell>
              <TableCell className="align-top text-center">
                <div className="flex justify-center">
                  <OrganizerApplicationRowActions
                    eventId={eventId}
                    row={row}
                    compact
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
