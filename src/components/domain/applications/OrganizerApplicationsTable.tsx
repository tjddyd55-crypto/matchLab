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
import { MATCH_CATEGORY_WITH_WEIGHT_LABEL } from "@/lib/ui-labels/match-category";
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
};

export function OrganizerApplicationsTable({
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
    <div className="hidden min-w-0 2xl:block">
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[3%]" />
            <TableHead className="w-[13%]">선수 이름</TableHead>
            <TableHead className="w-[10%]">체육관</TableHead>
            <TableHead className="w-[20%]">{MATCH_CATEGORY_WITH_WEIGHT_LABEL}</TableHead>
            <TableHead className="w-[10%]">입금내역</TableHead>
            <TableHead className="w-[10%]">상태</TableHead>
            <TableHead className="w-[24%] text-right">상태입력/처리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.applicationId}>
              <TableCell className="align-top">
                <Checkbox
                  checked={selectedIds.has(row.applicationId)}
                  onCheckedChange={(v) =>
                    onToggleSelect(row.applicationId, v === true)
                  }
                  aria-label={`${row.fighterName} 선택`}
                />
              </TableCell>
              <TableCell className="align-top">
                <div className="flex w-full min-w-0 items-center gap-2">
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
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {row.fighterName}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="align-top">
                <div className="truncate text-sm">{row.gymName}</div>
              </TableCell>
              <TableCell className="text-muted-foreground align-top text-xs leading-snug">
                <span className="line-clamp-2 break-words">{row.divisionLabel}</span>
              </TableCell>
              <TableCell className="align-top">
                <OrganizerPaymentDisplayBadge paymentStatus={row.paymentStatus} />
                {row.depositorName ? (
                  <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
                    {row.depositorName}
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="align-top">
                <OrganizerApplicationStatusBadge
                  applicationStatus={row.applicationStatus}
                  cancellationSource={row.cancellationSource}
                />
              </TableCell>
              <TableCell className="align-top text-right">
                <OrganizerApplicationRowActions
                  eventId={eventId}
                  row={row}
                  compact
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
